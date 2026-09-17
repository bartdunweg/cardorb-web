import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeCard, rereadMine, restoreCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import type { RemovedCard } from "@/lib/api-shapes";
import { type Outcome, answerLeftovers, flush, forgetMine, heldAction, makeRemoved, notifyMock, pageHeld, router } from "@/test/press-harness";
import { useCopySteps } from "./use-copy-steps";

/*
 * The plus and the minus under a tile: the count moves on the press and the store follows, one write
 * in the air at a time, always for the last count pressed. These pin that engine down before it is
 * refactored: rapid presses, answers that come late, failures, Undo and Put back in the middle of a
 * press, the page held while a press is unsent, and a page drawn again while one flies.
 */

vi.mock("@/app/(app)/dashboard/cards/actions", async () => (await import("@/test/press-harness")).cardsActionsMock());
vi.mock("@/components/app/toast", async () => (await import("@/test/press-harness")).toastMock());
vi.mock("@/lib/forget-mine", async () => (await import("@/test/press-harness")).forgetMineMock());
vi.mock("next/navigation", async () => (await import("@/test/press-harness")).navigationMock());

type Added = { ok: true; id?: string } | { ok: false; error: string };
type Props = Parameters<typeof useCopySteps>[0];

const writes = () => {
    const copies = heldAction<[string, number, { reread?: boolean }?], Outcome>({ ok: false, error: "left over" });
    vi.mocked(setCopies).mockImplementation(copies.fn);
    const removals = heldAction<[string, { reread?: boolean }?], Outcome & { card?: RemovedCard }>({ ok: false, error: "left over" });
    vi.mocked(removeCard).mockImplementation(removals.fn);
    return { copies, removals };
};

const mount = (props: Partial<Props> = {}) => {
    const onShown = vi.fn();
    const onStored = vi.fn();
    const initial: Props = { name: "Pikachu", held: 1, rowId: "r1", onShown, onStored, ...props };
    const hook = renderHook((p: Props) => useCopySteps(p), { initialProps: initial });
    return { ...hook, onShown, onStored, initial };
};

afterEach(() => act(answerLeftovers));

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rereadMine).mockResolvedValue(undefined);
    vi.mocked(setCopies).mockResolvedValue({ ok: true });
    vi.mocked(removeCard).mockResolvedValue({ ok: true });
    vi.mocked(restoreCard).mockResolvedValue({ ok: true });
    forgetMine.mockResolvedValue(undefined);
});

describe("useCopySteps: rapid presses", () => {
    it("settles +,+,+,- on the last count with one write per landing, not per press", async () => {
        const { copies } = writes();
        const { result, onShown } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(3));
        act(() => result.current.press(4));
        act(() => result.current.press(3));

        expect(result.current.held).toBe(3);
        expect(setCopies).toHaveBeenCalledTimes(1);
        expect(setCopies).toHaveBeenLastCalledWith("r1", 2, { reread: false });
        expect(onShown.mock.calls).toEqual([
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 3],
        ]);

        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        // The presses in between (3, 4) were never sent: the next write is for the last count.
        expect(setCopies).toHaveBeenCalledTimes(2);
        expect(setCopies).toHaveBeenLastCalledWith("r1", 3, { reread: false });
        expect(rereadMine).not.toHaveBeenCalled();

        await act(async () => copies.calls[1]!.resolve({ ok: true }));
        expect(setCopies).toHaveBeenCalledTimes(2);
        expect(rereadMine).toHaveBeenCalledTimes(1);
        expect(result.current.held).toBe(3);
        expect(result.current.error).toBeNull();
    });

    it("sends nothing more when the presses come back to the count already written", async () => {
        const { copies } = writes();
        const { result } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(3));
        act(() => result.current.press(2));
        await act(async () => copies.calls[0]!.resolve({ ok: true }));

        expect(setCopies).toHaveBeenCalledTimes(1);
        expect(rereadMine).toHaveBeenCalledTimes(1);
        expect(result.current.held).toBe(2);
    });

    it("goes round again for a press that lands during the re-read", async () => {
        const { copies } = writes();
        const reread = heldAction<[], void>();
        vi.mocked(rereadMine).mockImplementation(reread.fn);
        const { result } = mount();

        act(() => result.current.press(2));
        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        expect(rereadMine).toHaveBeenCalledTimes(1);

        act(() => result.current.press(3));
        // Still one flight: the press waits for the re-read rather than racing it.
        expect(setCopies).toHaveBeenCalledTimes(1);
        await act(async () => reread.calls[0]!.resolve());
        expect(setCopies).toHaveBeenCalledTimes(2);
        expect(setCopies).toHaveBeenLastCalledWith("r1", 3, { reread: false });

        await act(async () => copies.calls[1]!.resolve({ ok: true }));
        expect(rereadMine).toHaveBeenCalledTimes(2);
        await act(async () => reread.calls[1]!.resolve());
        expect(result.current.held).toBe(3);
        expect(pageHeld()).toBe(false);
    });

    it("reads the list quietly on a list tile instead of redrawing the page", async () => {
        const { copies } = writes();
        const { result } = mount({ quiet: true });

        act(() => result.current.press(2));
        await act(async () => copies.calls[0]!.resolve({ ok: true }));

        expect(forgetMine).toHaveBeenCalledWith("cards");
        expect(rereadMine).not.toHaveBeenCalled();
    });
});

describe("useCopySteps: answers that come late", () => {
    it("never has two writes in the air, so a later answer cannot land before an earlier one", async () => {
        const { copies } = writes();
        const { result, onStored } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(5));
        expect(copies.calls).toHaveLength(1);

        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        expect(onStored).toHaveBeenLastCalledWith(2, "r1");
        expect(copies.calls).toHaveLength(2);
        await act(async () => copies.calls[1]!.resolve({ ok: true }));
        expect(onStored.mock.calls).toEqual([
            [2, "r1"],
            [5, "r1"],
        ]);
    });

    it("keeps its own count over a page drawn from before the press, while the write flies", async () => {
        const { copies } = writes();
        const { result, rerender, initial } = mount();

        act(() => result.current.press(2));
        // The page answers from the store as it was: still one, but drawn again (a new row id would
        // be another page; the same key is the stale answer).
        rerender({ ...initial, held: 1 });
        expect(result.current.held).toBe(2);
        // A page with a different count arrives while the write is still in the air.
        rerender({ ...initial, held: 7 });
        expect(result.current.held).toBe(2);

        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        // Settled on the page the press was made on; the page since drawn is a different one and wins.
        expect(result.current.held).toBe(7);
    });

    it("takes a page drawn again over its own count once nothing flies, and writes the next press from it", async () => {
        const { copies } = writes();
        const { result, rerender, initial } = mount();

        act(() => result.current.press(2));
        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        expect(result.current.held).toBe(2);

        // The same page key as before the press: the tile keeps believing what it pressed.
        rerender({ ...initial, held: 1 });
        expect(result.current.held).toBe(2);

        // Another page: the store moved elsewhere (another device), the row is a new one.
        rerender({ ...initial, held: 4, rowId: "r9" });
        expect(result.current.held).toBe(4);

        act(() => result.current.press(5));
        expect(setCopies).toHaveBeenLastCalledWith("r9", 5, { reread: false });
        await act(async () => copies.calls[1]!.resolve({ ok: true }));
        expect(result.current.held).toBe(5);
    });
});

describe("useCopySteps: failures", () => {
    it("puts a refused write's count back to what the store holds and says why", async () => {
        const { copies } = writes();
        const { result, onShown, onStored } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(3));
        await act(async () => copies.calls[0]!.resolve({ ok: false, error: "The API said no" }));

        expect(result.current.held).toBe(1);
        expect(result.current.error).toBe("The API said no");
        expect(onShown).toHaveBeenLastCalledWith(3, 1);
        expect(onStored).not.toHaveBeenCalled();
        // What was still to send is dropped.
        expect(setCopies).toHaveBeenCalledTimes(1);
        expect(pageHeld()).toBe(false);
    });

    it("keeps the counts that landed before a later write failed", async () => {
        const { copies } = writes();
        const { result } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(3));
        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        await act(async () => copies.calls[1]!.resolve({ ok: false, error: "No" }));

        expect(result.current.held).toBe(2);
        expect(result.current.error).toBe("No");
    });

    it("treats a write that throws as a failure, and the next press writes again", async () => {
        const { copies } = writes();
        const { result } = mount();

        act(() => result.current.press(2));
        await act(async () => copies.calls[0]!.reject(new Error("offline")));

        expect(result.current.held).toBe(1);
        expect(result.current.error).toBe("Something went wrong. Try again.");
        expect(pageHeld()).toBe(false);

        act(() => result.current.press(2));
        expect(result.current.error).toBeNull();
        expect(setCopies).toHaveBeenCalledTimes(2);
        await act(async () => copies.calls[1]!.resolve({ ok: true }));
        expect(result.current.held).toBe(2);
    });

    it("says so when a card with no row is pressed on a page with no way to add it", async () => {
        const { result } = mount({ held: 0, rowId: undefined });

        await act(async () => result.current.press(1));

        expect(result.current.held).toBe(0);
        expect(result.current.error).toBe("This card cannot be added from here.");
    });
});

describe("useCopySteps: adding from nought", () => {
    it("adds, then removes the new row once its id is in, for a minus pressed before the add answered", async () => {
        const { removals } = writes();
        const adds = heldAction<[], Added>({ ok: false, error: "left over" });
        const { result, onStored } = mount({ held: 0, rowId: undefined, add: adds.fn });

        act(() => result.current.press(1));
        act(() => result.current.press(0));
        expect(result.current.held).toBe(0);
        expect(adds.calls).toHaveLength(1);
        expect(removeCard).not.toHaveBeenCalled();

        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "new-row" }));
        expect(notifyMock.done).toHaveBeenCalledWith("Pikachu is in your collection now", expect.anything());
        expect(onStored).toHaveBeenLastCalledWith(1, "new-row");
        expect(removeCard).toHaveBeenCalledWith("new-row", { reread: false });

        await act(async () => removals.calls[0]!.resolve({ ok: true, card: makeRemoved() }));
        expect(onStored).toHaveBeenLastCalledWith(0, undefined);
        expect(notifyMock.removed).toHaveBeenCalledWith("Pikachu is out of your collection", expect.objectContaining({ undo: expect.anything() }));
        expect(adds.fn).toHaveBeenCalledTimes(1);
        expect(removeCard).toHaveBeenCalledTimes(1);
        expect(setCopies).not.toHaveBeenCalled();
        expect(result.current.held).toBe(0);
    });

    it("adds once and then sets the count for plus presses made while the add flew", async () => {
        const { copies } = writes();
        const adds = heldAction<[], Added>({ ok: false, error: "left over" });
        const { result } = mount({ held: 0, rowId: undefined, add: adds.fn });

        act(() => result.current.press(1));
        act(() => result.current.press(2));
        act(() => result.current.press(3));
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "new-row" }));

        expect(adds.fn).toHaveBeenCalledTimes(1);
        expect(setCopies).toHaveBeenCalledWith("new-row", 3, { reread: false });
        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        expect(result.current.held).toBe(3);
    });

    it("says the page could not follow when the add answers without a row", async () => {
        const adds = heldAction<[], Added>({ ok: false, error: "left over" });
        const { result } = mount({ held: 0, rowId: undefined, add: adds.fn });

        act(() => result.current.press(1));
        await act(async () => adds.calls[0]!.resolve({ ok: true }));

        expect(result.current.held).toBe(0);
        expect(result.current.error).toBe("The card was added, but this page could not follow. Reload to see it.");
    });
});

describe("useCopySteps: Undo and Put back during a press", () => {
    const undoOf = (mock: typeof notifyMock.done, title: string) => {
        const call = mock.mock.calls.find(([t]) => t === title);
        return (call![1] as { undo: { onUndo: () => void } }).undo.onUndo;
    };

    it("Undo on the add while a plus is still in the air removes the row once, after that write lands", async () => {
        const { copies, removals } = writes();
        const adds = heldAction<[], Added>({ ok: false, error: "left over" });
        const { result, onShown } = mount({ held: 0, rowId: undefined, add: adds.fn });

        act(() => result.current.press(1));
        act(() => result.current.press(2));
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "new-row" }));
        expect(copies.calls).toHaveLength(1);

        act(() => undoOf(notifyMock.done, "Pikachu is in your collection now")());
        // At once on screen, and nothing removed while the plus is still in the air.
        expect(result.current.held).toBe(0);
        expect(onShown).toHaveBeenLastCalledWith(2, 0);
        expect(removeCard).not.toHaveBeenCalled();

        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        expect(removeCard).toHaveBeenCalledTimes(1);
        expect(removeCard).toHaveBeenCalledWith("new-row", { reread: false });
        await act(async () => removals.calls[0]!.resolve({ ok: true }));
        await act(flush);

        expect(removeCard).toHaveBeenCalledTimes(1);
        expect(result.current.held).toBe(0);
        expect(pageHeld()).toBe(false);
    });

    it("Undo on the add with nothing in the air removes the row itself and says Undone", async () => {
        writes();
        vi.mocked(removeCard).mockResolvedValue({ ok: true });
        const adds = heldAction<[], Added>({ ok: false, error: "left over" });
        const { result, onStored } = mount({ held: 0, rowId: undefined, add: adds.fn, quiet: true });

        act(() => result.current.press(1));
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "new-row" }));
        await act(flush);

        await act(async () => undoOf(notifyMock.done, "Pikachu is in your collection now")());
        await act(flush);

        expect(result.current.held).toBe(0);
        expect(onStored).toHaveBeenLastCalledWith(0, undefined);
        expect(removeCard).toHaveBeenCalledWith("new-row", { reread: false });
        expect(notifyMock.done).toHaveBeenLastCalledWith("Undone");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("Put back while the minus's re-read is still in the air restores the row once", async () => {
        const { removals } = writes();
        const reread = heldAction<[], void>();
        vi.mocked(rereadMine).mockImplementation(reread.fn);
        const removed = makeRemoved();
        const { result, rerender, initial } = mount();

        act(() => result.current.press(0));
        await act(async () => removals.calls[0]!.resolve({ ok: true, card: removed }));
        expect(rereadMine).toHaveBeenCalledTimes(1);

        act(() => undoOf(notifyMock.removed, "Pikachu is out of your collection")());
        expect(restoreCard).toHaveBeenCalledTimes(1);
        expect(restoreCard).toHaveBeenCalledWith(removed);

        await act(async () => reread.calls[0]!.resolve());
        expect(pageHeld()).toBe(false);
        // The tile follows the page the restore draws: the row is back under a new id.
        rerender({ ...initial, held: 1, rowId: "r-back" });
        expect(result.current.held).toBe(1);
        expect(restoreCard).toHaveBeenCalledTimes(1);
    });

    it("Put back on a list tile restores quietly and reads the list once the cache is gone", async () => {
        const { removals } = writes();
        const removed = makeRemoved();
        const { result } = mount({ quiet: true });

        act(() => result.current.press(0));
        await act(async () => removals.calls[0]!.resolve({ ok: true, card: removed }));
        forgetMine.mockClear();

        await act(async () => undoOf(notifyMock.removed, "Pikachu is out of your collection")());
        await act(flush);

        expect(restoreCard).toHaveBeenCalledWith(removed, { reread: false });
        expect(forgetMine).toHaveBeenCalledWith("cards");
        expect(router.refresh).toHaveBeenCalled();
    });
});

describe("useCopySteps: holding the page", () => {
    it("holds the page from the press until every write and the re-read have landed", async () => {
        const { copies } = writes();
        const reread = heldAction<[], void>();
        vi.mocked(rereadMine).mockImplementation(reread.fn);
        const { result } = mount();

        expect(pageHeld()).toBe(false);
        act(() => result.current.press(2));
        act(() => result.current.press(3));
        expect(pageHeld()).toBe(true);

        await act(async () => copies.calls[0]!.resolve({ ok: true }));
        expect(pageHeld()).toBe(true);
        await act(async () => copies.calls[1]!.resolve({ ok: true }));
        expect(pageHeld()).toBe(true);
        await act(async () => reread.calls[0]!.resolve());
        expect(pageHeld()).toBe(false);
    });

    it("lets the page go after a failure", async () => {
        const { removals } = writes();
        const { result } = mount();

        act(() => result.current.press(0));
        expect(pageHeld()).toBe(true);
        await act(async () => removals.calls[0]!.resolve({ ok: false, error: "No" }));
        expect(pageHeld()).toBe(false);
        expect(result.current.held).toBe(1);
    });
});
