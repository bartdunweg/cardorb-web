import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { answerLeftovers, heldAction, pageHeld } from "@/test/press-harness";
import { type Failure, type Held, type Landed, useLatestPress } from "./use-latest-press";

/*
 * The core under the plus and the heart, on its own: a counter whose every write the test answers
 * by hand. What the wrappers add (toasts, add or remove or set) is theirs to test.
 */

type Props = { value: number; id: string | undefined };

const mount = (initial: Props = { value: 1, id: "r1" }, failed: (f: Failure<number>) => string | null = (f) => f.error) => {
    const writes = heldAction<[Held<number>, number], Landed<number>>({ failure: "left over" });
    const settles = vi.fn(async () => undefined);
    const onStored = vi.fn();
    const onFailed = vi.fn(failed);
    const hook = renderHook((p: Props) => useLatestPress<number>({ ...p, write: writes.fn, settle: settles, onStored, onFailed }), {
        initialProps: initial,
    });
    return { ...hook, writes, settles, onStored, onFailed, initial };
};

afterEach(() => act(answerLeftovers));

describe("useLatestPress", () => {
    it("shows the press at once and writes only the first and the last of a run", async () => {
        const { result, writes, settles, onStored } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(3));
        act(() => result.current.press(4));
        expect(result.current.value).toBe(4);
        expect(writes.calls.map((c) => c.args)).toEqual([[{ value: 1, id: "r1" }, 2]]);
        expect(pageHeld()).toBe(true);

        await act(async () => writes.calls[0]!.resolve({ value: 2, id: "r1" }));
        expect(writes.calls[1]!.args).toEqual([{ value: 2, id: "r1" }, 4]);
        expect(settles).not.toHaveBeenCalled();

        await act(async () => writes.calls[1]!.resolve({ value: 4, id: "r1" }));
        expect(writes.calls).toHaveLength(2);
        expect(onStored.mock.calls).toEqual([[{ value: 2, id: "r1" }], [{ value: 4, id: "r1" }]]);
        expect(settles).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({ value: 4, id: "r1", error: null });
        expect(pageHeld()).toBe(false);
    });

    it("writes back to where the run began when the last press asks for it", async () => {
        const { result, writes, settles } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(1));
        await act(async () => writes.calls[0]!.resolve({ value: 2, id: "r1" }));
        await act(async () => writes.calls[1]!.resolve({ value: 1, id: "r1" }));

        expect(writes.calls).toHaveLength(2);
        expect(settles).toHaveBeenCalledTimes(1);
        expect(result.current.value).toBe(1);
    });

    it("goes round again for a press made while the run settles", async () => {
        const { result, writes, settles } = mount();
        const settling = heldAction<[], undefined>();
        settles.mockImplementation(settling.fn);

        act(() => result.current.press(2));
        await act(async () => writes.calls[0]!.resolve({ value: 2, id: "r1" }));
        act(() => result.current.press(3));
        expect(writes.calls).toHaveLength(1);

        await act(async () => settling.calls[0]!.resolve(undefined));
        expect(writes.calls[1]!.args).toEqual([{ value: 2, id: "r1" }, 3]);
        await act(async () => writes.calls[1]!.resolve({ value: 3, id: "r1" }));
        await act(async () => settling.calls[1]!.resolve(undefined));
        expect(settles).toHaveBeenCalledTimes(2);
        expect(pageHeld()).toBe(false);
    });

    it("hides the row while the screen shows a value the store has not reached", async () => {
        const { result, writes } = mount({ value: 0, id: undefined });

        act(() => result.current.press(1));
        expect(result.current).toMatchObject({ value: 1, id: undefined });
        await act(async () => writes.calls[0]!.resolve({ value: 1, id: "new" }));
        expect(result.current).toMatchObject({ value: 1, id: "new" });
    });

    it("puts a refused run back to what the store holds, drops the rest and shows what onFailed returns", async () => {
        const { result, writes, settles, onFailed } = mount();

        act(() => result.current.press(2));
        act(() => result.current.press(3));
        await act(async () => writes.calls[0]!.resolve({ failure: "No" }));

        expect(writes.calls).toHaveLength(1);
        expect(onFailed).toHaveBeenCalledWith({ error: "No", threw: false, wanted: 3, stored: { value: 1, id: "r1" } });
        expect(result.current).toMatchObject({ value: 1, error: "No" });
        // The run still settles: writes before the refusal may have landed.
        expect(settles).toHaveBeenCalledTimes(1);
        expect(pageHeld()).toBe(false);

        act(() => result.current.press(2));
        expect(result.current.error).toBeNull();
        expect(writes.calls[1]!.args).toEqual([{ value: 1, id: "r1" }, 2]);
    });

    it("treats a write that throws as a failure, without settling, and lets onFailed keep the error off screen", async () => {
        const { result, writes, settles, onFailed } = mount(undefined, () => null);

        act(() => result.current.press(2));
        await act(async () => writes.calls[0]!.reject(new Error("offline")));

        expect(onFailed).toHaveBeenCalledWith({ error: "Something went wrong. Try again.", threw: true, wanted: 2, stored: { value: 1, id: "r1" } });
        expect(result.current).toMatchObject({ value: 1, error: null });
        expect(settles).not.toHaveBeenCalled();
        expect(pageHeld()).toBe(false);
    });

    it("keeps its own value over the page it was pressed on, and takes a different page once nothing flies", async () => {
        const { result, writes, rerender, initial } = mount();

        act(() => result.current.press(2));
        await act(async () => writes.calls[0]!.resolve({ value: 2, id: "r1" }));
        rerender({ ...initial });
        expect(result.current.value).toBe(2);

        rerender({ value: 5, id: "r9" });
        expect(result.current).toMatchObject({ value: 5, id: "r9" });
        act(() => result.current.press(6));
        expect(writes.calls[1]!.args).toEqual([{ value: 5, id: "r9" }, 6]);
    });

    it("aims without sending, and keep sets what the store holds for the next press", async () => {
        const { result, writes, onStored } = mount();

        let aimed: { wanted: number; flying: boolean } | undefined;
        act(() => {
            aimed = result.current.aim(0);
        });
        expect(aimed).toEqual({ wanted: 1, flying: false });
        expect(result.current.value).toBe(0);
        expect(writes.calls).toHaveLength(0);

        act(() => result.current.keep({ value: 0, id: undefined }));
        expect(onStored).toHaveBeenLastCalledWith({ value: 0, id: undefined });
        act(() => result.current.press(1));
        expect(writes.calls[0]!.args).toEqual([{ value: 0, id: undefined }, 1]);
    });
});
