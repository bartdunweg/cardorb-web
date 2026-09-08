import { updateTag } from "next/cache";
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
/** The one API call `forgetMine` makes: the profile it reads its own username off. */
const { readProfile } = vi.hoisted(() => ({ readProfile: vi.fn(async () => ({ username: "Bart" })) }));
vi.mock("@/lib/api", () => ({
    ApiError: class extends Error {},
    api: readProfile,
    session: async () => ({ userId: "u1", token: "t" }),
}));

const { forgetMine, perUser, publicTag } = await import("@/lib/user-cache");

describe("perUser", () => {
    beforeEach(() => {
        memo.clear();
        vi.mocked(updateTag).mockClear();
        readProfile.mockClear();
    });

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

describe("forgetMine", () => {
    beforeEach(() => {
        memo.clear();
        vi.mocked(updateTag).mockClear();
        readProfile.mockClear();
        readProfile.mockResolvedValue({ username: "Bart" });
    });

    it("drops the public pages of the writer's own name, not only their own screens", async () => {
        await forgetMine();
        expect(vi.mocked(updateTag).mock.calls.flat()).toEqual(["user:u1", "public:bart"]);
    });

    it("reads the name before dropping the tag it is cached under", async () => {
        await forgetMine();
        // The other way round the read would miss and cost a call on every single write.
        expect(readProfile.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(updateTag).mock.invocationCallOrder[0]);
    });

    it("still drops the writer's own tag when the name cannot be read", async () => {
        readProfile.mockRejectedValue(new Error("the API is down"));
        await expect(forgetMine()).resolves.toBeUndefined();
        expect(vi.mocked(updateTag).mock.calls.flat()).toEqual(["user:u1"]);
    });
});

describe("publicTag", () => {
    it("is one tag however the link was capitalised", () => {
        expect(publicTag("Bart")).toBe(publicTag("bart"));
    });
});
