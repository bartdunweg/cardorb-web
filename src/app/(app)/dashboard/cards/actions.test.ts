import { beforeEach, describe, expect, it, vi } from "vitest";
import { pokemonCardFromSetCard } from "@/lib/api-shapes";

// Only what reaches the API is under test: the write itself is a stand-in that answers nothing.
const { api } = vi.hoisted(() => ({ api: vi.fn(async () => ({})) }));
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api }));
vi.mock("@/lib/user-cache", () => ({ forgetMine: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }));

const { addCard, rereadMine, searchPokemon, setCopies } = await import("./actions");
const { forgetMine } = await import("@/lib/user-cache");

const tile = {
    id: "sv03.5-011",
    number: "011",
    name: "Metapod",
    localName: null,
    setName: "151",
    rarity: null,
    types: ["Grass"],
    imageUrl: null,
    imageHighUrl: null,
    owned: false,
    wishlist: false,
    quantity: 0,
    itemIds: [],
    price: null,
    tcgId: "sv03.5-011",
};

const posted = () => (api.mock.calls[0] as unknown as [string, { body: Record<string, unknown> }])[1].body;

beforeEach(() => api.mockClear());

/**
 * A set tile carries null for what its shelf did not send: an English one has no language, a
 * Japanese one had no tcgId until cardorb-api sent it. Both went to the API as `null`, and a schema
 * that took only "absent" turned every add from every set page into "expected string, received
 * null", with the button looking like it had done nothing (#308).
 */
describe("addCard from a set page", () => {
    it("takes an English tile, and sends it without a language", async () => {
        expect(await addCard(pokemonCardFromSetCard(tile, "en"))).toEqual({ ok: true });
        expect(posted()).toMatchObject({ name: "Metapod", set: "151", number: "011", tcgId: "sv03.5-011" });
        expect(posted()).not.toHaveProperty("language");
    });

    it("takes a Japanese tile, and sends the catalogue and the id together", async () => {
        expect(await addCard(pokemonCardFromSetCard({ ...tile, id: "SV2a-011", name: "トランセル", tcgId: "SV2a-011" }, "ja"))).toEqual({ ok: true });
        expect(posted()).toMatchObject({ tcgId: "SV2a-011", language: "ja" });
    });

    it("takes a Japanese tile the shelf sent no id for, so the API can say what it cannot find", async () => {
        expect(await addCard(pokemonCardFromSetCard({ ...tile, id: "SV2a-011", tcgId: null }, "ja"))).toEqual({ ok: true });
        expect(posted()).toMatchObject({ language: "ja" });
        expect(posted()).not.toHaveProperty("tcgId");
    });

    it("still refuses a card with no set", async () => {
        expect(await addCard(pokemonCardFromSetCard({ ...tile, setName: "" }, "en"))).toMatchObject({ ok: false });
        expect(api).not.toHaveBeenCalled();
    });
});

/** The API answers the language asked, and nothing but English when none is. */
describe("searchPokemon", () => {
    const call = () => (api.mock.calls[0] as unknown as [string, { params: Record<string, unknown> }])[1].params;
    beforeEach(() => api.mockResolvedValue({ cards: [], total: 0 } as never));

    it("asks the English catalogue by default, naming no language", async () => {
        await searchPokemon("char");
        expect(call()).toEqual({ query: "char" });
    });

    it("asks the catalogue of the language chosen, and reads English as none", async () => {
        await searchPokemon("リザードン", { language: "ja" });
        expect(call()).toEqual({ query: "リザードン", language: "ja" });
        api.mockClear();
        await searchPokemon("char", { language: "en" });
        expect(call()).toEqual({ query: "char" });
    });

    it("hands a hit from another language on with its catalogue and id", async () => {
        api.mockResolvedValue({
            total: 1,
            cards: [
                {
                    id: "SV2a-006",
                    number: "006",
                    name: "リザードンex",
                    setName: "Pokémon Card 151",
                    image: null,
                    imageHigh: null,
                    rarity: null,
                    types: [],
                    series: "SV",
                    owned: false,
                    wishlist: false,
                    quantity: 0,
                    itemIds: [],
                    tcgId: "SV2a-006",
                    price: null,
                    priceHolo: null,
                },
            ],
        } as never);
        const { items } = await searchPokemon("リザードン", { language: "ja" });
        expect(items[0]).toMatchObject({ tcgId: "SV2a-006", language: "ja" });
    });
});

/**
 * A run of presses on the count is several writes and one re-read. A write that forgot on its own
 * re-rendered the page inside its answer, and a press landing during that render left the render's
 * older list in the cache after the press had dropped it: ×4 on the list behind a sheet saying 2.
 */
describe("setCopies", () => {
    beforeEach(() => vi.mocked(forgetMine).mockClear());

    it("forgets the cached answers after the write, by default", async () => {
        await setCopies("d6ba4891-3908-48d0-b4da-ed0096bd4360", 3);
        expect(api).toHaveBeenCalledWith("/collection/items/d6ba4891-3908-48d0-b4da-ed0096bd4360", { method: "PATCH", body: { quantity: 3 } });
        expect(forgetMine).toHaveBeenCalledTimes(1);
    });

    it("writes and nothing more when told the caller re-reads once, later", async () => {
        await setCopies("d6ba4891-3908-48d0-b4da-ed0096bd4360", 3, { reread: false });
        expect(api).toHaveBeenCalledTimes(1);
        expect(forgetMine).not.toHaveBeenCalled();
        await rereadMine();
        expect(forgetMine).toHaveBeenCalledTimes(1);
    });
});
