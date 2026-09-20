import { afterEach, describe, expect, it, vi } from "vitest";
import { cardPriceHistory, countCards, isReadFailed, listBinders, loadMoreCards, searchPokemon, tryListBinders } from "@/lib/reads";

/*
 * The reads fail the way their actions did, because the callers were written against that: a
 * count that cannot say is null and the button says "Show results", while a search or a batch that
 * does not come throws, so the box can say the service did not answer and the list can offer to
 * try again. An input the route refuses is the action's own empty answer, never an error.
 */

const answer = (status: number, body: unknown = null) => vi.fn().mockResolvedValue(new Response(status === 200 ? JSON.stringify(body) : null, { status }));

afterEach(() => vi.unstubAllGlobals());

describe("the list and search reads", () => {
    it("send a structured input as one JSON value and read the answer", async () => {
        const fetch = answer(200, { cards: [], total: 3 });
        vi.stubGlobal("fetch", fetch);
        expect(await loadMoreCards({ set: ["base1"], offset: 48 })).toEqual({ cards: [], total: 3 });
        const url = new URL(fetch.mock.calls[0][0], "https://cardorb.com");
        expect(url.pathname).toBe("/api/read/more");
        expect(JSON.parse(url.searchParams.get("input")!)).toEqual({ set: ["base1"], offset: 48 });
    });

    it("throw where the action threw: a search or a batch that does not come", async () => {
        vi.stubGlobal("fetch", answer(500));
        await expect(searchPokemon("charizard")).rejects.toThrow();
        await expect(loadMoreCards({ offset: 48 })).rejects.toThrow();
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
        await expect(searchPokemon("charizard")).rejects.toThrow();
    });

    it("answer the action's empty answer for an input the route refuses", async () => {
        vi.stubGlobal("fetch", answer(400));
        expect(await searchPokemon("c".repeat(101))).toEqual({ items: [] });
    });

    it("fall back softly where the action did: a count that cannot say is null", async () => {
        vi.stubGlobal("fetch", answer(500));
        expect(await countCards({ q: "pika" })).toBeNull();
    });
});

/*
 * The two reads that have to tell an empty answer from one that never came: a price line drawn as
 * "no readings yet" and a binder list read as an account with no binders were both a read that
 * failed, and the screens said something untrue about the collection (error-path audit).
 */
describe("a read that did not answer", () => {
    it("is told apart from an empty answer, where the caller asked to be told", async () => {
        vi.stubGlobal("fetch", answer(500));
        expect(isReadFailed(await cardPriceHistory("base1-4"))).toBe(true);
        expect(isReadFailed(await tryListBinders())).toBe(true);
    });

    it("is not the empty answer, which stays what it is", async () => {
        // One Response per stub: its body is read once (the answer helper hands back the same one).
        vi.stubGlobal("fetch", answer(200, []));
        expect(await tryListBinders()).toEqual([]);
        vi.stubGlobal("fetch", answer(200, []));
        expect(isReadFailed(await tryListBinders())).toBe(false);
    });

    it("changes nothing for the soft readers beside them", async () => {
        vi.stubGlobal("fetch", answer(500));
        expect(await listBinders()).toEqual([]);
        expect(await countCards({ q: "pika" })).toBeNull();
    });
});
