import { beforeEach, describe, expect, it, vi } from "vitest";
import { pokemonCardFromSetCard } from "@/lib/api-shapes";

// Only what reaches the API is under test: the write itself is a stand-in that answers nothing.
const { api } = vi.hoisted(() => ({ api: vi.fn(async () => ({})) }));
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api }));
vi.mock("@/lib/user-cache", () => ({ forgetMine: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }));

const { addCard } = await import("./actions");

const tile = {
    id: "sv03.5-011",
    number: "011",
    name: "Metapod",
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
 * null" — with the button looking like it had done nothing (#308).
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
