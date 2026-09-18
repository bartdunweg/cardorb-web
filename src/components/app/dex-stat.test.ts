import { describe, expect, it, vi } from "vitest";

/**
 * Home's Pokémon tile reads every card in the collection to count the species it covers, and draws
 * none of them. The printings' own pictures of that read were 1,191 ms of the 1,442 ms it cost
 * (measured 2026-09-18, 1,922 cards), so it asks for the cards without them.
 */

const { getAllMyCards } = vi.hoisted(() => ({ getAllMyCards: vi.fn() }));
vi.mock("@/lib/cards", () => ({ getAllMyCards }));
vi.mock("@/lib/pokedex", () => ({ getDexNames: async () => new Map() }));
vi.mock("@/lib/binders", () => ({ getDexBinder: async () => ({ pokedex: { missing: false, rarities: [] } }) }));
vi.mock("@/lib/dex-groups", () => ({ groupByDex: () => ({ caught: 151 }) }));
vi.mock("@/lib/side-read", () => ({ sideRead: (_name: string, read: () => unknown) => Promise.resolve(read()) }));
vi.mock("@/lib/user-cache", () => ({ perUser: (_scope: string, _name: string, run: (token: string) => unknown) => run("t.o.k.e.n") }));

const { readDexCaught } = await import("@/components/app/dex-stat");

describe("readDexCaught", () => {
    it("reads every card without the printings' pictures, which it would only throw away", async () => {
        getAllMyCards.mockResolvedValue({ cards: [] });
        expect(await readDexCaught()).toBe(151);
        expect(getAllMyCards).toHaveBeenCalledWith(expect.objectContaining({ pictures: false }), "t.o.k.e.n");
    });
});
