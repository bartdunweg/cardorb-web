import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeCard } from "@/app/(app)/dashboard/cards/actions";
import type { RemovedCard } from "@/lib/api-shapes";
import { type Outcome, answerLeftovers, forgetMine, heldAction, notifyMock, pageHeld } from "@/test/press-harness";
import { useWishStep } from "./use-wish-step";

/*
 * The heart under a set tile, pressed faster than the store answers. The engine is the plus's
 * (`useCopySteps`): one write in the air, always for the last state pressed. These pin it before the
 * two are refactored into one.
 */

vi.mock("@/app/(app)/dashboard/cards/actions", async () => (await import("@/test/press-harness")).cardsActionsMock());
vi.mock("@/components/app/toast", async () => (await import("@/test/press-harness")).toastMock());
vi.mock("@/lib/forget-mine", async () => (await import("@/test/press-harness")).forgetMineMock());

type Added = { ok: true; id?: string } | { ok: false; error: string };
type Props = Parameters<typeof useWishStep>[0];

const mount = (props: Partial<Props> = {}) => {
    const adds = heldAction<[], Added>({ ok: false, error: "left over" });
    const removals = heldAction<[string, { reread?: boolean }?], Outcome & { card?: RemovedCard }>({ ok: false, error: "left over" });
    vi.mocked(removeCard).mockImplementation(removals.fn);
    const onShown = vi.fn();
    const onStored = vi.fn();
    const initial: Props = { name: "Pikachu", wished: false, rowId: undefined, add: adds.fn, onShown, onStored, ...props };
    const hook = renderHook((p: Props) => useWishStep(p), { initialProps: initial });
    return { ...hook, adds, removals, onShown, onStored, initial };
};

afterEach(() => act(answerLeftovers));

beforeEach(() => {
    vi.clearAllMocks();
    forgetMine.mockResolvedValue(undefined);
});

describe("useWishStep: rapid presses", () => {
    it("settles on, off, on as on with a single add", async () => {
        const { result, adds, onShown } = mount();

        act(() => result.current.press(true));
        act(() => result.current.press(false));
        act(() => result.current.press(true));
        expect(result.current.wished).toBe(true);
        expect(onShown.mock.calls).toEqual([[true], [false], [true]]);
        expect(adds.fn).toHaveBeenCalledTimes(1);

        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));

        expect(adds.fn).toHaveBeenCalledTimes(1);
        expect(removeCard).not.toHaveBeenCalled();
        expect(result.current.wished).toBe(true);
        expect(result.current.id).toBe("wish-1");
        expect(forgetMine).toHaveBeenCalledTimes(1);
        expect(forgetMine).toHaveBeenCalledWith("cards", null);
    });

    it("settles on, off as off: the add, then the removal of the row it made", async () => {
        const { result, adds, removals, onStored } = mount();

        act(() => result.current.press(true));
        act(() => result.current.press(false));
        expect(removeCard).not.toHaveBeenCalled();

        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        expect(removeCard).toHaveBeenCalledWith("wish-1", { reread: false });
        expect(result.current.wished).toBe(false);

        await act(async () => removals.calls[0]!.resolve({ ok: true }));
        expect(onStored.mock.calls).toEqual([["wish-1"], [undefined]]);
        expect(result.current.wished).toBe(false);
        expect(result.current.id).toBeUndefined();
        expect(adds.fn).toHaveBeenCalledTimes(1);
        expect(removeCard).toHaveBeenCalledTimes(1);
    });

    it("hides the row id while the heart shows a state the store has not reached", async () => {
        const { result, adds } = mount();

        act(() => result.current.press(true));
        expect(result.current.id).toBeUndefined();
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        expect(result.current.id).toBe("wish-1");
    });
});

describe("useWishStep: answers that come late", () => {
    it("sends the removal only after the add has answered, with the id the add gave", async () => {
        const { result, adds, removals } = mount();

        act(() => result.current.press(true));
        act(() => result.current.press(false));
        act(() => result.current.press(true));
        act(() => result.current.press(false));
        expect(adds.calls).toHaveLength(1);
        expect(removals.calls).toHaveLength(0);

        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        expect(removals.calls).toHaveLength(1);
        expect(removals.calls[0]!.args[0]).toBe("wish-1");
    });

    it("keeps what it pressed over a page drawn from before the press while the write flies", async () => {
        const { result, adds, rerender, initial } = mount();

        act(() => result.current.press(true));
        rerender({ ...initial, wished: false });
        expect(result.current.wished).toBe(true);

        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        rerender({ ...initial, wished: false });
        // Same page key as the one pressed on: the heart still believes its own press.
        expect(result.current.wished).toBe(true);

        // A page drawn with the row: a new key, and it agrees.
        rerender({ ...initial, wished: true, rowId: "wish-1" });
        expect(result.current.wished).toBe(true);
        expect(result.current.id).toBe("wish-1");
    });

    it("starts the next press from a page drawn again since the last one", async () => {
        const { result, rerender, initial } = mount();

        // The store says wished, on a row this tile never wrote (another device).
        rerender({ ...initial, wished: true, rowId: "elsewhere" });
        act(() => result.current.press(false));
        expect(removeCard).toHaveBeenCalledWith("elsewhere", { reread: false });
    });
});

describe("useWishStep: failures", () => {
    it("puts the heart back and says so when a removal throws mid-run, and the next press removes again", async () => {
        const { result, adds, removals, onShown } = mount();

        act(() => result.current.press(true));
        act(() => result.current.press(false));
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        await act(async () => removals.calls[0]!.reject(new Error("offline")));

        expect(result.current.wished).toBe(true);
        expect(onShown).toHaveBeenLastCalledWith(true);
        expect(notifyMock.failed).toHaveBeenCalledWith("Pikachu is still on your wishlist");
        expect(pageHeld()).toBe(false);
        expect(forgetMine).not.toHaveBeenCalled();

        act(() => result.current.press(false));
        expect(removals.calls).toHaveLength(2);
        expect(removals.calls[1]!.args[0]).toBe("wish-1");
        await act(async () => removals.calls[1]!.resolve({ ok: true }));
        expect(result.current.wished).toBe(false);
    });

    it("shows a refusal as the hook's error rather than a toast", async () => {
        const { result, adds } = mount();

        act(() => result.current.press(true));
        await act(async () => adds.calls[0]!.resolve({ ok: false, error: "The API said no" }));

        expect(result.current.wished).toBe(false);
        expect(result.current.error).toBe("The API said no");
        expect(notifyMock.failed).not.toHaveBeenCalled();

        act(() => result.current.press(true));
        expect(result.current.error).toBeNull();
        expect(adds.fn).toHaveBeenCalledTimes(2);
    });

    it("offers the way back on the toast, which presses the heart as it is now", async () => {
        const { result, adds, removals } = mount();

        act(() => result.current.press(true));
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        const [, options] = notifyMock.done.mock.calls.find(([t]) => t === "Pikachu is on your wishlist now")!;

        act(() => (options as { undo: { onUndo: () => void } }).undo.onUndo());
        expect(result.current.wished).toBe(false);
        expect(removals.calls[0]!.args[0]).toBe("wish-1");
        await act(async () => removals.calls[0]!.resolve({ ok: true }));
        expect(result.current.wished).toBe(false);
    });
});

describe("useWishStep: holding the page", () => {
    it("holds the page across every write of a run and lets it go once the last has landed", async () => {
        const { result, adds, removals } = mount();

        act(() => result.current.press(true));
        act(() => result.current.press(false));
        expect(pageHeld()).toBe(true);
        await act(async () => adds.calls[0]!.resolve({ ok: true, id: "wish-1" }));
        expect(pageHeld()).toBe(true);
        await act(async () => removals.calls[0]!.resolve({ ok: true }));
        expect(pageHeld()).toBe(false);
    });

    it("lets the page go after a refusal", async () => {
        const { result, adds } = mount();

        act(() => result.current.press(true));
        await act(async () => adds.calls[0]!.resolve({ ok: false, error: "No" }));
        expect(pageHeld()).toBe(false);
    });
});
