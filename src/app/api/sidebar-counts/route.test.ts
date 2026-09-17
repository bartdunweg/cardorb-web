import { beforeEach, describe, expect, it, vi } from "vitest";

const { session, readMyBinders, getFavoritesCount } = vi.hoisted(() => ({
    session: vi.fn(),
    readMyBinders: vi.fn(),
    getFavoritesCount: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ session }));
vi.mock("@/lib/binders", () => ({ readMyBinders, getFavoritesCount }));

const { GET } = await import("./route");

/** The sidebar's numbers after a write: a binders read that fails must not read as "no binders". */
describe("GET /api/sidebar-counts", () => {
    beforeEach(() => {
        session.mockReset().mockResolvedValue({ token: "t" });
        readMyBinders.mockReset();
        getFavoritesCount.mockReset().mockResolvedValue(3);
    });

    it("answers the binders and the favourites", async () => {
        readMyBinders.mockResolvedValue([{ id: "a", name: "Base", kind: "manual", count: 2 }]);
        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ binders: [{ id: "a", name: "Base", kind: "manual", count: 2 }], favorites: 3 });
    });

    it("answers null for the binders when their read fails, so the sidebar keeps its list", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        readMyBinders.mockRejectedValue(new Error("503"));
        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ binders: null, favorites: 3 });
    });

    it("refuses without a session", async () => {
        session.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
    });
});
