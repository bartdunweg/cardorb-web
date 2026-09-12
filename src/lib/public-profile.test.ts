import { describe, expect, it, vi } from "vitest";
import { readPublicListQuery } from "@/lib/list-query";

// Only the wiring is under test here, so the API is a stand-in that answers the empty shape.
const { api } = vi.hoisted(() => ({ api: vi.fn(async () => ({ cards: [], folders: [], total: 0 })) }));
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }));

const { countPublicCards, getAllPublicCards, getPublicCards, getPublicFolders, getPublicProfile } = await import("@/lib/public-profile");

/**
 * The reads a visitor's page makes, all five. A public read is cached for five minutes with no
 * session behind it, so one that carries no tag cannot be dropped when the owner makes the
 * profile private, it keeps answering. This is the test that catches a sixth one added without.
 */
const reads: [string, () => Promise<unknown>][] = [
    ["profile", () => getPublicProfile("Bart")],
    ["cards", () => getPublicCards("Bart", readPublicListQuery({}))],
    ["every card", () => getAllPublicCards("Bart", readPublicListQuery({}))],
    ["folders", () => getPublicFolders("Bart")],
    ["a count", () => countPublicCards("Bart")],
];

describe("the public reads", () => {
    it.each(reads)("files %s under the owner's tag", async (_name, read) => {
        api.mockClear();
        await read();
        expect(api).toHaveBeenCalled();
        for (const [, init] of api.mock.calls as unknown as [string, { tags?: string[] }][]) {
            expect(init.tags).toEqual(["public:bart"]);
        }
    });
});
