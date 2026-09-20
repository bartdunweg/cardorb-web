import { beforeEach, describe, expect, it, vi } from "vitest";
import { pokemonCardFromSetCard } from "@/lib/api-shapes";

// Only what reaches the API is under test: the write itself is a stand-in that answers nothing.
const { api, ApiError } = vi.hoisted(() => ({
    api: vi.fn(async () => ({})),
    // Carries a status, so an action's answer to a refusal can be read (write-failure.ts).
    ApiError: class ApiError extends Error {
        status: number;
        constructor(status: number, message = "") {
            super(message);
            this.status = status;
        }
    },
}));
vi.mock("@/lib/api", () => ({ ApiError, api }));
vi.mock("@/lib/user-cache", () => ({ forgetMine: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }));

const { addCard, editCopies, listSetRows, markOwnedWith, removeCard, rereadMine, restoreCard, searchPokemon, setCopies, setDexFace, splitCopy } =
    await import("./actions");
const { forgetMine } = await import("@/lib/user-cache");

const tile = {
    id: "sv03.5-011",
    number: "011",
    name: "Metapod",
    localName: null,
    setName: "151",
    rarity: null,
    category: null,
    trainerType: null,
    types: ["Grass"],
    imageUrl: null,
    imageHighUrl: null,
    owned: false,
    wishlist: false,
    quantity: 0,
    itemIds: [],
    price: null,
    tcgId: "sv03.5-011",
    setAbbr: null,
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

    it("sends the printing and run pressed in the sheet, under the names the API's card draft reads", async () => {
        await addCard(pokemonCardFromSetCard(tile, "en"), "collection", undefined, {
            printing: { finish: "holo", foilPattern: "cosmos" },
            edition: "1st-edition",
        });
        expect(posted()).toMatchObject({ finish: "holo", foilPattern: "cosmos", edition: "1st-edition" });
    });

    it("sends no printing where the sheet offered none, so the API picks the card's default", async () => {
        await addCard(pokemonCardFromSetCard(tile, "en"));
        expect(posted()).not.toHaveProperty("finish");
        expect(posted()).not.toHaveProperty("edition");
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
        expect(forgetMine).toHaveBeenCalledWith("cards");
    });

    it("writes and nothing more when told the caller re-reads once, later", async () => {
        await setCopies("d6ba4891-3908-48d0-b4da-ed0096bd4360", 3, { reread: false });
        expect(api).toHaveBeenCalledTimes(1);
        expect(forgetMine).not.toHaveBeenCalled();
        await rereadMine();
        expect(forgetMine).toHaveBeenCalledTimes(1);
        expect(forgetMine).toHaveBeenCalledWith("cards");
    });
});

/* A set page's rows for its sheets: the set whole, held and wished for, in one answer each. */
describe("listSetRows", () => {
    it("asks the collection and the wishlist for the whole set", async () => {
        api.mockImplementation(async () => ({ cards: [], total: 0 }));
        expect(await listSetRows("Base Set")).toEqual([]);
        const asked = (api.mock.calls as unknown as [string, { params: Record<string, unknown> }][]).map(([path, o]) => [path, o.params]);
        expect(asked).toEqual([
            ["/cards", expect.objectContaining({ set: "Base Set", owned: true, limit: 1000, facets: 0 })],
            ["/cards", expect.objectContaining({ set: "Base Set", owned: false, limit: 1000, facets: 0 })],
        ]);
    });

    it("answers null, not an empty set, where the API does not answer", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        api.mockReset().mockRejectedValueOnce(new Error("down")).mockResolvedValue({ cards: [], total: 0 });
        expect(await listSetRows("Base Set")).toBeNull();
        expect(await listSetRows("")).toBeNull();
    });
});

/*
 * The writes the card sheet makes, none of which had a test. Each is read the same way as
 * setCopies above: what body reaches the API, what the action answers when the API refuses, and
 * which write name is forgotten afterwards. None of the six names a set: they are made from a
 * row, which carries no set id, so they drop every set page (cache-scopes.ts).
 */
const ID = "d6ba4891-3908-48d0-b4da-ed0096bd4360";
const OTHER = "a1f0c7d2-5f4e-4b3a-9c21-0d3e5b6f7a80";

/** The one call an action made: its path, its method and its body. */
const call = (i = 0) => {
    const made = api.mock.calls[i] as unknown as [string, { method?: string; body?: Record<string, unknown> }] | undefined;
    if (!made) throw new Error(`no call ${i}`);
    return { path: made[0], method: made[1]?.method, body: made[1]?.body };
};

const freshly = () => {
    api.mockReset().mockResolvedValue({} as never);
    vi.mocked(forgetMine).mockClear();
};

describe("splitCopy", () => {
    beforeEach(freshly);

    it("posts the differences and how many copies take them, to the row's own split", async () => {
        expect(await splitCopy(ID, { condition: "Near Mint", language: "de" }, 2)).toEqual({ ok: true });
        expect(call()).toEqual({ path: `/collection/items/${ID}/split`, method: "POST", body: { condition: "Near Mint", language: "de", count: 2 } });
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("cards");
    });

    it("splits one copy off where no count is given", async () => {
        await splitCopy(ID, { grade: "PSA 10" });
        expect(call().body).toEqual({ grade: "PSA 10", count: 1 });
    });

    it("refuses a split with nothing to differ in, before the API is asked", async () => {
        expect(await splitCopy(ID, {})).toEqual({ ok: false, error: "Invalid input." });
        expect(await splitCopy("not-a-row", { condition: "Near Mint" })).toEqual({ ok: false, error: "Invalid input." });
        expect(api).not.toHaveBeenCalled();
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(404);
        });
        expect(await splitCopy(ID, { condition: "Near Mint" })).toEqual({ ok: false, error: "That is not there any more. Reload the page." });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("writes and nothing more when the caller re-reads once, later", async () => {
        await splitCopy(ID, { condition: "Near Mint" }, 1, { reread: false });
        expect(api).toHaveBeenCalledTimes(1);
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("editCopies", () => {
    beforeEach(freshly);

    it("sends every row of the kind beside the fields, in one call", async () => {
        expect(await editCopies([ID, OTHER], { condition: "Near Mint" })).toEqual({ ok: true });
        expect(call()).toEqual({ path: "/collection/items", method: "PATCH", body: { ids: [ID, OTHER], condition: "Near Mint" } });
        expect(api).toHaveBeenCalledTimes(1);
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("cards");
    });

    it("counts a row named twice as one row", async () => {
        await editCopies([ID, ID], { grade: "PSA 9" });
        expect(call().body).toEqual({ ids: [ID], grade: "PSA 9" });
    });

    it("refuses no rows, a row that is not one, and nothing to change", async () => {
        expect(await editCopies([], { condition: "Near Mint" })).toEqual({ ok: false, error: "Invalid input." });
        expect(await editCopies(["not-a-row"], { condition: "Near Mint" })).toEqual({ ok: false, error: "Invalid input." });
        expect(await editCopies([ID], {})).toEqual({ ok: false, error: "Invalid input." });
        expect(api).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(403);
        });
        expect(await editCopies([ID], { condition: "Near Mint" })).toEqual({ ok: false, error: "That is not yours to change." });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("writes and nothing more when the caller re-reads once, later", async () => {
        await editCopies([ID], { condition: "Near Mint" }, { reread: false });
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("markOwnedWith", () => {
    beforeEach(freshly);

    it("marks the wish owned and stamps the day it was got, with what is known about it", async () => {
        expect(await markOwnedWith(ID, { condition: "Near Mint", purchasePrice: 12.5 })).toEqual({ ok: true });
        expect(call().path).toBe(`/collection/items/${ID}`);
        expect(call().method).toBe("PATCH");
        expect(call().body).toMatchObject({ owned: true, condition: "Near Mint", purchasePrice: 12.5 });
        expect(String(call().body?.acquiredAt)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        // R-DATA-002: owned and wishlist are one another's opposite, and the API flips both on `owned`.
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("cards");
    });

    it("keeps the day the person gave over today's", async () => {
        await markOwnedWith(ID, { acquiredAt: "2019-04-02T00:00:00.000Z" });
        expect(call().body?.acquiredAt).toBe("2019-04-02T00:00:00.000Z");
    });

    it("refuses a row that is not one, and an edit it does not know", async () => {
        expect(await markOwnedWith("not-a-row", {})).toEqual({ ok: false, error: "Invalid input." });
        expect(await markOwnedWith(ID, { condition: "x".repeat(60) })).toEqual({ ok: false, error: "Invalid input." });
        expect(api).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(401);
        });
        expect(await markOwnedWith(ID, {})).toEqual({ ok: false, error: "Your session has ended. Sign in and try again.", signedOut: true });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("writes and nothing more when the caller re-reads once, later", async () => {
        await markOwnedWith(ID, {}, { reread: false });
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("removeCard", () => {
    beforeEach(freshly);

    it("deletes the row with a body, because the API wants a JSON content type on a delete", async () => {
        const card = { name: "Metapod", number: "011", setName: "151", owned: true };
        api.mockResolvedValue({ card } as never);
        expect(await removeCard(ID)).toEqual({ ok: true, card });
        expect(call().path).toBe(`/collection/items/${ID}`);
        expect(call().method).toBe("DELETE");
        expect(call().body).toEqual({});
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("cards");
    });

    it("is still a removal where the API hands back no row, only one with no way back", async () => {
        api.mockResolvedValue({} as never);
        expect(await removeCard(ID)).toEqual({ ok: true, card: undefined });
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("cards");
    });

    it("refuses a row that is not one", async () => {
        expect(await removeCard("not-a-row")).toEqual({ ok: false, error: "Invalid card." });
        expect(api).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(500);
        });
        expect(await removeCard(ID)).toMatchObject({ ok: false });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("writes and nothing more when the caller re-reads once, later", async () => {
        await removeCard(ID, { reread: false });
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("restoreCard", () => {
    beforeEach(freshly);

    const removed = {
        name: "Metapod",
        number: "011",
        setName: "151",
        owned: true,
        types: ["Grass"],
        rarity: "Common",
        finish: "holo" as const,
        edition: "1st-edition" as const,
        quantity: 2,
        condition: "Near Mint",
        language: "de",
        purchasePrice: 4.5,
        acquiredAt: "2019-04-02T00:00:00.000Z",
        isFavorite: true,
    };

    it("puts the row back whole, the day it was got and its run among the fields", async () => {
        expect(await restoreCard(removed)).toEqual({ ok: true });
        expect(call().path).toBe("/cards");
        expect(call().method).toBe("POST");
        expect(call().body).toMatchObject({
            name: "Metapod",
            set: "151",
            number: "011",
            types: ["Grass"],
            // `collection` is the API's word for owned; a wish goes back to the wishlist.
            collection: true,
            finish: "holo",
            edition: "1st-edition",
            quantity: 2,
            condition: "Near Mint",
            language: "de",
            purchasePrice: 4.5,
            acquiredAt: "2019-04-02T00:00:00.000Z",
            isFavorite: true,
        });
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("cards");
    });

    it("puts a wish back on the wishlist, and sends nothing it was not told", async () => {
        await restoreCard({ name: "Metapod", number: "011", setName: "151", owned: false });
        expect(call().body).toMatchObject({ collection: false });
        for (const field of ["rarity", "finish", "edition", "quantity", "condition", "grade", "language", "notes", "isFavorite", "acquiredAt"]) {
            expect(call().body).not.toHaveProperty(field);
        }
    });

    it("refuses a row it cannot read", async () => {
        expect(await restoreCard({ name: "Metapod" } as never)).toEqual({ ok: false, error: "That card cannot be put back." });
        expect(api).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(429);
        });
        expect(await restoreCard(removed)).toEqual({ ok: false, error: "That was a lot of changes at once. Wait a moment and try again." });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("writes and nothing more when the caller re-reads once, later", async () => {
        await restoreCard(removed, { reread: false });
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("setDexFace", () => {
    beforeEach(freshly);

    it("clears the old face before it sets the new one, so a failure leaves at most none", async () => {
        expect(await setDexFace(ID, OTHER)).toEqual({ ok: true });
        expect(call(0)).toEqual({ path: `/collection/items/${OTHER}`, method: "PATCH", body: { dexFace: false } });
        expect(call(1)).toEqual({ path: `/collection/items/${ID}`, method: "PATCH", body: { dexFace: true } });
    });

    it("writes once where the slot showed nothing, or showed this very card", async () => {
        await setDexFace(ID, null);
        expect(api).toHaveBeenCalledTimes(1);
        expect(call(0).body).toEqual({ dexFace: true });
        api.mockClear();
        await setDexFace(ID, ID);
        expect(api).toHaveBeenCalledTimes(1);
        expect(call(0).path).toBe(`/collection/items/${ID}`);
    });

    /*
     * No forgetMine at all: dropping a tag in an action would redraw a thousand slots for a picture
     * already on screen. The grid forgets `dexFace` quietly after the write (dex-grid.tsx).
     */
    it("forgets nothing, on either answer", async () => {
        await setDexFace(ID, OTHER);
        expect(forgetMine).not.toHaveBeenCalled();
        api.mockImplementationOnce(async () => {
            throw new ApiError(403);
        });
        expect(await setDexFace(ID, OTHER)).toEqual({ ok: false, error: "That is not yours to change." });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("leaves the new face unwritten when clearing the old one fails", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(500);
        });
        expect(await setDexFace(ID, OTHER)).toMatchObject({ ok: false });
        expect(api).toHaveBeenCalledTimes(1);
    });

    it("refuses a card or a slot that is not a row", async () => {
        expect(await setDexFace("not-a-row", null)).toEqual({ ok: false, error: "Invalid card." });
        expect(await setDexFace(ID, "not-a-row")).toEqual({ ok: false, error: "Invalid card." });
        expect(api).not.toHaveBeenCalled();
    });
});
