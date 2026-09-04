import { beforeEach, describe, expect, it, vi } from "vitest";

// React's `cache` only memoises inside a render; here one memo stands in for one request.
const memo = new Map<unknown, unknown>();
vi.mock("react", async (original) => ({
    ...(await original<typeof import("react")>()),
    cache: (fn: () => unknown) => () => {
        if (!memo.has(fn)) memo.set(fn, fn());
        return memo.get(fn);
    },
}));
vi.mock("next/cache", () => ({
    unstable_cache: (fn: () => unknown) => fn,
    updateTag: vi.fn(),
    revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
    ApiError: class extends Error {},
    session: async () => ({ userId: "u1", token: "t" }),
}));

const { forgetMine, perUser } = await import("@/lib/user-cache");

describe("perUser", () => {
    beforeEach(() => memo.clear());

    it("reads a name once per request, whoever asks", async () => {
        const load = vi.fn(async () => 42);
        const [a, b] = await Promise.all([perUser("stats", load), perUser("stats", load)]);
        expect(a).toBe(42);
        expect(b).toBe(42);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it("keeps two names apart", async () => {
        const stats = vi.fn(async () => 1);
        const folders = vi.fn(async () => 2);
        await Promise.all([perUser("stats", stats), perUser("folders", folders)]);
        expect(stats).toHaveBeenCalledTimes(1);
        expect(folders).toHaveBeenCalledTimes(1);
    });

    it("reads again after a write in the same request", async () => {
        const load = vi.fn(async () => 1);
        await perUser("stats", load);
        await forgetMine();
        await perUser("stats", load);
        expect(load).toHaveBeenCalledTimes(2);
    });
});
