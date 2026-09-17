import { beforeEach, describe, expect, it, vi } from "vitest";

const { forgetMineLater } = vi.hoisted(() => ({ forgetMineLater: vi.fn<(write?: string) => Promise<boolean>>(async () => true) }));
vi.mock("@/lib/user-cache", () => ({ forgetMineLater }));

const { POST } = await import("./route");

const post = (query = "", origin: string | null = "https://cardorb.com") =>
    POST(new Request(`https://cardorb.com/api/forget-mine${query}`, { method: "POST", headers: origin === null ? {} : { origin } }));

describe("POST /api/forget-mine", () => {
    beforeEach(() => {
        forgetMineLater.mockClear();
        forgetMineLater.mockResolvedValue(true);
    });

    it("forgets what the write names", async () => {
        for (const write of ["cards", "binders", "profile", "all"]) {
            expect((await post(`?write=${write}`)).status).toBe(204);
            expect(forgetMineLater).toHaveBeenLastCalledWith(write);
        }
    });

    it("forgets everything when no write is named", async () => {
        expect((await post()).status).toBe(204);
        expect(forgetMineLater).toHaveBeenCalledWith("all");
    });

    it("refuses a write it does not know, and forgets nothing", async () => {
        for (const query of ["?write=", "?write=stats", "?write=CARDS", "?write=user:someone"]) expect((await post(query)).status).toBe(400);
        expect(forgetMineLater).not.toHaveBeenCalled();
    });

    it("refuses another site, and forgets nothing", async () => {
        expect((await post("?write=cards", "https://evil.example")).status).toBe(403);
        expect((await post("?write=cards", "null")).status).toBe(403);
        expect((await post("?write=cards", null)).status).toBe(403);
        expect(forgetMineLater).not.toHaveBeenCalled();
    });

    it("says 401 without a session", async () => {
        forgetMineLater.mockResolvedValue(false);
        expect((await post("?write=cards")).status).toBe(401);
    });
});
