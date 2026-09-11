import { describe, expect, it, vi } from "vitest";
import { settleLatest } from "./settle-latest";

type Outcome = { ok: true } | { ok: false; error: string };

/** A write whose answer the test releases by hand, so presses can land while one is in the air. */
const held = () => {
    const pending: Array<{ key: string; value: number; answer: (o: Outcome) => void }> = [];
    const write = vi.fn(
        (key: string, value: number) =>
            new Promise<Outcome>((answer) => {
                pending.push({ key, value, answer });
            }),
    );
    return { write, pending };
};

describe("settleLatest", () => {
    it("sends the first value at once, then only the last one asked for while it flew", async () => {
        const { write, pending } = held();
        const settle = settleLatest(write);
        const failed = vi.fn();

        const first = settle("row", 2, failed);
        expect(await settle("row", 3, failed)).toBeNull();
        expect(await settle("row", 4, failed)).toBeNull();
        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenLastCalledWith("row", 2);

        pending[0].answer({ ok: true });
        await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
        expect(write).toHaveBeenLastCalledWith("row", 4);

        pending[1].answer({ ok: true });
        expect(await first).toBe(true);
        expect(failed).not.toHaveBeenCalled();
    });

    it("keeps rows apart: a press on another row is not held up", async () => {
        const { write, pending } = held();
        const settle = settleLatest(write);
        void settle("a", 2, vi.fn());
        void settle("b", 5, vi.fn());
        expect(write).toHaveBeenCalledTimes(2);
        pending.forEach((p) => p.answer({ ok: true }));
    });

    it("on a failure drops what was still to send and tells the latest ask why", async () => {
        const { write, pending } = held();
        const settle = settleLatest(write);
        const firstFailed = vi.fn();
        const lastFailed = vi.fn();

        const first = settle("row", 2, firstFailed);
        void settle("row", 3, lastFailed);
        pending[0].answer({ ok: false, error: "The API said no" });

        expect(await first).toBe(false);
        expect(write).toHaveBeenCalledTimes(1);
        expect(lastFailed).toHaveBeenCalledWith("The API said no");
        expect(firstFailed).not.toHaveBeenCalled();

        // The key is free again: the next press flies.
        void settle("row", 4, vi.fn());
        expect(write).toHaveBeenCalledTimes(2);
    });
});
