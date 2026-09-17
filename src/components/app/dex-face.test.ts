import { beforeEach, describe, expect, it, vi } from "vitest";

const { failed } = vi.hoisted(() => ({ failed: vi.fn() }));
vi.mock("@/components/app/toast", () => ({ notify: { failed, done: vi.fn() } }));
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({ setDexFace: vi.fn() }));
vi.mock("@/lib/reads", () => ({ listCopies: vi.fn() }));

const { settleFace } = await import("./dex-grid");

/** Where a Pokédex slot's swipe settles is written as its face; a write that does not land is put back and said. */
describe("settleFace", () => {
    beforeEach(() => {
        failed.mockReset();
    });

    it("moves the face and keeps it when the write lands", async () => {
        const face = { current: "a" };
        const write = vi.fn().mockResolvedValue({ ok: true });
        await settleFace(face, "b", write);
        expect(write).toHaveBeenCalledWith("b", "a");
        expect(face.current).toBe("b");
        expect(failed).not.toHaveBeenCalled();
    });

    it("writes nothing for the card that is already the face", async () => {
        const face = { current: "a" };
        const write = vi.fn();
        await settleFace(face, "a", write);
        expect(write).not.toHaveBeenCalled();
    });

    it("puts the face back and says so when the write answers no", async () => {
        const face = { current: "a" };
        await settleFace(face, "b", vi.fn().mockResolvedValue({ ok: false, error: "x" }));
        expect(face.current).toBe("a");
        expect(failed).toHaveBeenCalledOnce();
    });

    it("puts the face back when the write throws", async () => {
        const face = { current: "a" };
        await settleFace(face, "b", vi.fn().mockRejectedValue(new Error("network")));
        expect(face.current).toBe("a");
        expect(failed).toHaveBeenCalledOnce();
    });

    it("leaves a later swipe's face alone when an earlier write fails", async () => {
        const face = { current: "a" };
        let reject!: (error: Error) => void;
        const first = settleFace(
            face,
            "b",
            () =>
                new Promise((_, no) => {
                    reject = no;
                }),
        );
        const second = settleFace(face, "c", vi.fn().mockResolvedValue({ ok: true }));
        reject(new Error("network"));
        await Promise.all([first, second]);
        expect(face.current).toBe("c");
    });
});
