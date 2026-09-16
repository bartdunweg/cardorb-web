import { afterEach, describe, expect, it, vi } from "vitest";
import { countCards, loadMoreCards, searchPokemon } from "@/lib/reads";

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
