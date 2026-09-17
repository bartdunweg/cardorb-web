import { describe, expect, it, vi } from "vitest";
import { type Outcome, flush, heldAction } from "@/test/press-harness";
import { settleLatest } from "./settle-latest";

/*
 * The card sheet's copy stepper writes through settleLatest. The first tests (settle-latest.test.ts)
 * cover the basic run; these add the orders a refactor could get wrong: keys answering out of order,
 * a stale write landing after a newer ask, and a write that throws instead of answering.
 */

const setup = () => {
    const writes = heldAction<[string, number], Outcome>({ ok: false, error: "left over" });
    // The store as the writes leave it, in the order they land.
    const store = new Map<string, number>();
    const settle = settleLatest(async (key: string, value: number) => {
        const res = await writes.fn(key, value);
        if (res.ok) store.set(key, value);
        return res;
    });
    return { writes, store, settle };
};

describe("settleLatest under pressure", () => {
    it("lets two keys answer in either order without one holding up or overwriting the other", async () => {
        const { writes, store, settle } = setup();

        const a = settle("a", 1, vi.fn());
        const b = settle("b", 9, vi.fn());
        void settle("a", 2, vi.fn());
        expect(writes.calls.map((c) => c.args)).toEqual([
            ["a", 1],
            ["b", 9],
        ]);

        // b answers first.
        writes.calls[1]!.resolve({ ok: true });
        expect(await b).toBe(true);
        writes.calls[0]!.resolve({ ok: true });
        await flush();
        expect(writes.calls[2]!.args).toEqual(["a", 2]);
        writes.calls[2]!.resolve({ ok: true });
        expect(await a).toBe(true);

        expect(store).toEqual(
            new Map([
                ["a", 2],
                ["b", 9],
            ]),
        );
    });

    it("never lets an older value land after a newer one for the same key", async () => {
        const { writes, store, settle } = setup();

        const first = settle("row", 2, vi.fn());
        for (const n of [3, 4, 5, 6]) void settle("row", n, vi.fn());
        // Only one write for the key is ever in the air, so the newer one cannot overtake it.
        expect(writes.calls).toHaveLength(1);

        writes.calls[0]!.resolve({ ok: true });
        await flush();
        expect(store.get("row")).toBe(2);
        expect(writes.calls).toHaveLength(2);
        expect(writes.calls[1]!.args).toEqual(["row", 6]);

        writes.calls[1]!.resolve({ ok: true });
        expect(await first).toBe(true);
        expect(store.get("row")).toBe(6);
        expect(writes.fn).toHaveBeenCalledTimes(2);
    });

    it("sends the latest ask again after a write whose answer came while a newer ask waited", async () => {
        const { writes, settle } = setup();

        const first = settle("row", 2, vi.fn());
        writes.calls[0]!.resolve({ ok: true });
        // The answer is in, but the loop has not run yet: this ask still joins the flight.
        expect(await settle("row", 1, vi.fn())).toBeNull();
        await flush();
        expect(writes.calls[1]!.args).toEqual(["row", 1]);
        writes.calls[1]!.resolve({ ok: true });
        expect(await first).toBe(true);
    });

    it("on a refusal tells only the latest ask, and the next ask starts a flight of its own", async () => {
        const { writes, settle } = setup();
        const failedFirst = vi.fn();
        const failedSecond = vi.fn();
        const failedThird = vi.fn();

        const first = settle("row", 2, failedFirst);
        void settle("row", 3, failedSecond);
        void settle("row", 4, failedThird);
        writes.calls[0]!.resolve({ ok: false, error: "No" });

        expect(await first).toBe(false);
        expect(failedThird).toHaveBeenCalledWith("No");
        expect(failedFirst).not.toHaveBeenCalled();
        expect(failedSecond).not.toHaveBeenCalled();
        expect(writes.calls).toHaveLength(1);

        const next = settle("row", 7, vi.fn());
        expect(writes.calls[1]!.args).toEqual(["row", 7]);
        writes.calls[1]!.resolve({ ok: true });
        expect(await next).toBe(true);
    });

    it("on a write that throws rejects the starter, tells no one, drops the queued ask and frees the key", async () => {
        const { writes, settle } = setup();
        const failedFirst = vi.fn();
        const failedQueued = vi.fn();

        const first = settle("row", 2, failedFirst);
        void settle("row", 3, failedQueued);
        writes.calls[0]!.reject(new Error("offline"));

        await expect(first).rejects.toThrow("offline");
        // A throw is not a refusal: nobody's `failed` hears of it. Callers must wrap the write in
        // orFailed (write-outcome.ts) or catch the returned promise themselves.
        expect(failedFirst).not.toHaveBeenCalled();
        expect(failedQueued).not.toHaveBeenCalled();
        await flush();
        expect(writes.calls).toHaveLength(1);

        // The queued 3 is still in the map but is replaced by the next ask, never sent.
        const next = settle("row", 5, vi.fn());
        expect(writes.calls.map((c) => c.args)).toEqual([
            ["row", 2],
            ["row", 5],
        ]);
        writes.calls[1]!.resolve({ ok: true });
        expect(await next).toBe(true);
        expect(writes.fn).toHaveBeenCalledTimes(2);
    });
});
