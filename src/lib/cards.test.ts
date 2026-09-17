import { describe, expect, it, vi } from "vitest";
import { FORGETS } from "@/lib/cache-scopes";
import type { Card } from "@/lib/cards";
import { groupByDex } from "@/lib/dex-groups";

// The wiring alone: the API is a stand-in that answers cards already in the app's shape, and perUser
// records what it was asked to keep and runs the read, as it does on a miss.
const { api, kept } = vi.hoisted(() => ({ api: vi.fn(), kept: [] as { scope: string; name: string }[] }));
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api }));
vi.mock("@/lib/api-shapes", async (original) => ({ ...(await original<typeof import("@/lib/api-shapes")>()), cardFromItem: (card: Card) => card }));
vi.mock("@/lib/user-cache", () => ({
    perUser: (scope: string, name: string, run: (token: string) => unknown) => {
        kept.push({ scope, name });
        return run("t.o.k.e.n");
    },
}));

const { dexCardsKey, getDexCards, logDexEntrySize } = await import("@/lib/cards");

const card = (n: number): Card =>
    ({
        id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
        name: "Charizard",
        local_name: null,
        set_name: "Base Set",
        set_abbr: "BS",
        set: "base1",
        number: "4",
        printed_number: "4/102",
        rarity: "Rare Holo",
        gen: "Base",
        types: ["Fire"],
        quantity: 2,
        owned: true,
        is_favorite: false,
        dex_face: n === 1,
        excluded: false,
        condition: "Near Mint",
        grade: null,
        language: "en",
        finish: "holo",
        foil_pattern: null,
        edition: null,
        price_first_ed: null,
        price_source: "tcgplayer",
        price_printing: "holofoil",
        tcgplayer_id: 42382,
        purchase_price: 250,
        purchase_date: "2025-03-14",
        acquired_at: "2025-03-14T10:22:31.123Z",
        notes: "From the binder in the attic",
        price: 312.5,
        image_url: "https://images.cardorb.com/tcgdex/en/base/base1/4/low.webp",
        image_high_url: "https://images.cardorb.com/tcgdex/en/base/base1/4/high.webp",
        print_image_url: null,
        tcg_id: "base1-4",
        collection_id: null,
        species_id: 6,
        wishlist: false,
    }) as Card;

const facets = { sets: [{ name: "base1", title: "Base Set" }], rarities: ["Rare Holo"], gens: [], types: [] };
const answer = (cards: Card[]) => ({ cards, total: cards.length, copies: cards.length, value: 0, unpriced: 0, facets });

describe("getDexCards", () => {
    it("is kept in the lists scope, which a card write, a binder write and a new face all forget", async () => {
        api.mockResolvedValueOnce(answer([card(1)]));
        kept.length = 0;
        await getDexCards({ collectionId: "b1" });
        expect(kept).toEqual([{ scope: "lists", name: dexCardsKey({ collectionId: "b1" }) }]);
        expect(FORGETS.cards).toContain("lists");
        expect(FORGETS.binders).toContain("lists");
        expect(FORGETS.dexFace).toContain("lists");
    });

    it("keys on the whole filter: another binder, search or rarity is another entry", () => {
        const base = dexCardsKey({ collectionId: "b1" });
        expect(dexCardsKey({ collectionId: "b2" })).not.toBe(base);
        expect(dexCardsKey({ collectionId: "b1", q: "char" })).not.toBe(base);
        expect(dexCardsKey({ collectionId: "b1", rarity: ["Rare Holo"] })).not.toBe(base);
        expect(dexCardsKey({ collectionId: "b1" })).toBe(base);
    });

    it("keeps what a slot reads and the facets, and the slots come out the same as from whole cards", async () => {
        const cards = [card(1), card(2)];
        api.mockResolvedValueOnce(answer(cards));
        const got = await getDexCards({ collectionId: "b1" });
        expect(got.facets.rarities).toEqual(["Rare Holo"]);
        expect(got.cards[0]).not.toHaveProperty("notes");
        expect(got.cards[0]).not.toHaveProperty("purchase_price");
        const names = new Map([[6, { name: "Charizard", artwork: null }]]);
        const setting = { missing: false, rarities: ["Rare Holo"] };
        expect(groupByDex(got.cards, names, setting)).toEqual(groupByDex(cards, names, setting));
    });

    it("stays well under the Data Cache's 2 MB for the API's two thousand cards", async () => {
        api.mockResolvedValueOnce(answer(Array.from({ length: 2000 }, (_, i) => card(i))));
        const got = await getDexCards({ collectionId: "b1" });
        expect(got.cards).toHaveLength(2000);
        expect(new TextEncoder().encode(JSON.stringify(got)).length).toBeLessThan(1024 * 1024);
    });

    it("logs the size of the entry it keeps, and warns once it nears the 2 MB limit", async () => {
        const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        api.mockResolvedValueOnce(answer([card(1)]));
        const got = await getDexCards({ collectionId: "b1" });
        const bytes = new TextEncoder().encode(JSON.stringify(got)).length;
        expect(info).toHaveBeenCalledWith(expect.stringContaining(`[cache] dex-cards entry ${bytes} bytes, 1 cards`));
        expect(warn).not.toHaveBeenCalled();

        const big = { cards: got.cards, facets: { ...got.facets, sets: [{ name: "x".repeat(1.6 * 1024 * 1024), title: "X" }] } };
        logDexEntrySize(big);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("near the limit"));
        info.mockRestore();
        warn.mockRestore();
    });
});
