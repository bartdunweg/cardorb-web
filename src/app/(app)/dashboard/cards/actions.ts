"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import {
    type PokemonCard,
    type RemovedCard,
    cardFactsAnswer,
    copyAnswer,
    pokemonCardFromBrowse,
    pricePointsAnswer,
    removedAnswer,
    removedCardSchema,
    searchAnswer,
} from "@/lib/api-shapes";
import { type CardTitle, type TitleSet, distinctTitles, matchTitles } from "@/lib/card-titles";
import { type Card, getMyCards } from "@/lib/cards";
import { type CardName, type CopyEdits, copyEdits, sameCard } from "@/lib/copies";
import { type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";
import { getSets } from "@/lib/sets";
import { forgetMine } from "@/lib/user-cache";

export type { PokemonCard } from "@/lib/api-shapes";

/** A hit in your own collection is the whole card, so a tap on it can open the card rather than a search for its name. */
export type CardHit = Card;

type Result = { ok: true } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const term = z.string().trim().max(100);
const choice = z.string().trim().min(1).max(100).optional();

/** The chips under a collection search: a set (as the API addresses it) and a rarity, matched whole, as on a folder page. */
export type MyCardsFilters = { set?: string; rarity?: string };

// Searches the signed-in person's own collection (a binder's add-from-collection dialog). A filter
// on its own lists that set or rarity; without one the term has to be at least a character.
export async function searchMyCards(query: string, filters: MyCardsFilters = {}): Promise<CardHit[]> {
    const parsed = z.object({ q: term, set: choice, rarity: choice }).safeParse({ q: query, ...filters });
    if (!parsed.success) return [];
    const { q, set, rarity } = parsed.data;
    if (!q && !set && !rarity) return [];

    const { cards } = await getMyCards({ q: q || undefined, set, rarity, facets: false, limit: 20 });
    return cards;
}

/** Which list a suggestion may come from: the binder the field sits on, with its filters still on. */
export type TitleScope = { collectionId?: string; wishlist?: boolean; favoritesOnly?: boolean; set?: string; rarity?: string };

export type { CardTitle, TitleSet } from "@/lib/card-titles";

/** Rows read in one go to build the index. A collection past this asks the API per term instead. */
const INDEX_ROWS = 2500;

const titleScope = z.object({
    collectionId: choice,
    wishlist: z.boolean().optional(),
    favoritesOnly: z.boolean().optional(),
    set: choice,
    rarity: choice,
});

/**
 * Every title in one binder, once, so the browser can answer its own typing.
 *
 * The command palette already works this way against the catalogue: what makes a search feel
 * instant is that the list is in the browser, not how quickly the server answers. A collection is
 * small enough to send whole (the names alone, not the rows), and the sets come with it: the
 * field offers those too, because the list it filters can be narrowed to a set as well as a name.
 *
 * `complete` is false where the collection is larger than one read: the field then asks per term
 * (`suggestCardTitles`), as it did before.
 */
export async function collectionIndex(scope: TitleScope = {}): Promise<{ titles: CardTitle[]; sets: TitleSet[]; complete: boolean }> {
    const parsed = titleScope.safeParse(scope);
    if (!parsed.success) return { titles: [], sets: [], complete: false };

    const { cards, facets } = await getMyCards({ ...parsed.data, facets: true, limit: INDEX_ROWS });
    return { titles: distinctTitles(cards), sets: facets.sets, complete: cards.length < INDEX_ROWS };
}

/**
 * The titles under a binder's search field, from the API: the fallback for a collection too large
 * to hold in the browser, and for the first keystrokes while the index is still on its way.
 *
 * Two letters before it asks: one letter matches most of a collection, which is a list of
 * everything rather than a suggestion. An API that does not answer leaves the field as it was,
 * free text, which is what it has always been.
 */
export async function suggestCardTitles(query: string, scope: TitleScope = {}): Promise<CardTitle[]> {
    const parsed = titleScope.extend({ q: z.string().trim().min(2).max(100) }).safeParse({ q: query, ...scope });
    if (!parsed.success) return [];
    const { q, ...rest } = parsed.data;

    // Rows enough to fold into a screenful of titles: one name can hold a dozen printings.
    const { cards } = await getMyCards({ q, ...rest, facets: false, limit: 60 });
    return matchTitles(distinctTitles(cards), q);
}

/**
 * The chips under a catalogue search: a set by its name and an energy type, and which catalogue
 * is asked. "en" and absent are the same, the English one; the set and the type are English
 * facets, so the screens offer them there alone.
 */
export type CatalogueFilters = { set?: string; type?: string; language?: BrowseLanguage };

// Searches the catalogue through the API, which also says whether each hit is already yours. With
// a filter on, the API's fielded mode is asked instead: the term matches the name only, the set
// and the type their own fields; the term may then be empty, or one character.
//
// An API that does not answer throws, and the box shows that it did not. It used to return an
// empty list, which reads as "No cards found."; for a week that is what "charizard" said while
// the catalogue behind the API refused three requests in five (cardorb-api#260). A term the
// schema refuses is still an empty answer: nothing was asked.
//
// Twenty a page, the API's own size (the palette's SEARCH_PAGE_SIZE); `page` is the next twenty
// of the same question, asked when the list is scrolled to its end. There are 125 Charizards,
// and the first twenty were the only ones anyone could reach.
export async function searchPokemon(query: string, filters: CatalogueFilters = {}, page = 1): Promise<{ items: PokemonCard[]; total?: number }> {
    const parsed = z
        .object({ q: term, set: choice, type: choice, language: z.custom<BrowseLanguage>(isBrowseLanguage).optional(), page: z.number().int().min(1).max(50) })
        .safeParse({ q: query, ...filters, page });
    if (!parsed.success) return { items: [] };
    const { q, set, type } = parsed.data;
    // The English catalogue is the API's default; naming it would only be a longer way to ask.
    const language = parsed.data.language && parsed.data.language !== "en" ? parsed.data.language : null;
    const fields = set || type ? { ...(q ? { name: q } : {}), ...(set ? { set } : {}), ...(type ? { type } : {}) } : q.length >= 2 ? { query: q } : null;
    if (!fields) return { items: [] };
    const params = { ...fields, ...(language ? { language } : {}), ...(parsed.data.page > 1 ? { page: parsed.data.page } : {}) };

    const { cards, total } = await api("/catalog/search", { params, schema: searchAnswer });
    return { items: cards.map((c) => pokemonCardFromBrowse(c, language)), total };
}

const cardSchema = z.object({
    name: z.string().trim().min(1),
    set: z.string().trim().min(1, "That card has no set."),
    number: z.string().trim(),
    rarity: z.string().nullable(),
    types: z.array(z.string()).nullable(),
    /**
     * The catalogue's own id, and which catalogue it belongs to.
     *
     * Both may be missing or null: everything added before today has neither and the API still
     * resolves those by set name, and a set tile carries null for what its shelf did not send.
     * They are how a card from the Japanese, Korean or Chinese shelves is findable at all: those
     * sets have no English name, so the name the API would look up does not exist. Together they
     * say "this row is that card, in that catalogue" (cardorb-api#257).
     *
     * `nullish`, not `optional`: an English tile sends `language: null`, and `optional` refused
     * that as "expected string, received null": every add from every set page, since #308.
     */
    tcgId: z.string().trim().min(1).nullish(),
    language: z.string().trim().min(2).max(5).nullish(),
});

// Adds a catalogue card to the collection or the wishlist. The API matches it against the
// catalogues, picks the picture and the price; nothing about the card is stored from here.
export async function addCard(input: PokemonCard, target: "collection" | "wishlist" = "collection", collectionId?: string): Promise<Result> {
    const parsed = cardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const c = parsed.data;
    const wishlist = target === "wishlist";
    try {
        await api("/cards", {
            method: "POST",
            body: {
                name: c.name,
                set: c.set,
                number: c.number,
                ...(c.rarity ? { rarity: c.rarity } : {}),
                // Only when the card came from another language's shelf. An English card carries
                // neither and is resolved the way every row before it was.
                ...(c.tcgId ? { tcgId: c.tcgId } : {}),
                ...(c.language && c.language !== "en" ? { language: c.language } : {}),
                types: c.types ?? [],
                collection: !wishlist,
                // Added from a folder's own page: filed in it at once.
                ...(collectionId && !wishlist && z.string().uuid().safeParse(collectionId).success ? { collectionId } : {}),
            },
        });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// Sets how many of one copy are held. The API refuses 0: a card you no longer hold is removed.
//
// `reread: false` writes and nothing more, for a caller that presses several times and re-reads
// once, through rereadMine(). Forgetting here re-renders the page inside this action's answer
// (updateTag does that on its own), and a press that lands while that render is reading the list
// leaves the render's answer, from before the press, filling the cache after the press dropped
// it. Four copies pressed down to two said ×4 on the list behind the sheet until the next write.
export async function setCopies(cardId: string, quantity: number, { reread = true }: { reread?: boolean } = {}): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), quantity: z.number().int().min(1).max(999) }).safeParse({ cardId, quantity });
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { quantity: parsed.data.quantity } });
    } catch (err) {
        return failed(err);
    }

    if (reread) await forgetMine();
    return { ok: true };
}

// After a run of writes that did not forget on their own: the cached answers go, and the page
// re-renders from the API with nothing else in flight.
export async function rereadMine(): Promise<void> {
    await forgetMine();
}

// Removes one row: an owned copy or a wish. The API wants a JSON content type on a delete, so
// the body is an empty object.
export async function removeCard(cardId: string): Promise<Result & { card?: RemovedCard }> {
    const parsed = z.string().uuid().safeParse(cardId);
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    /* The row as it was, handed back by the delete because that is the last moment it exists.
       It is what an undo puts back, and nothing is kept anywhere for it: the caller holds it
       for as long as its toast is on screen and then it is gone, which is the honest lifetime
       of a way back.

       An API that has not deployed this yet answers without a card. A removal is still a
       removal then; it just cannot be undone, so `card` is optional rather than required. */
    let card: RemovedCard | undefined;
    try {
        const answer = await api(`/collection/items/${parsed.data}`, { method: "DELETE", body: {}, schema: removedAnswer });
        card = answer.card ?? undefined;
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true, card };
}

/**
 * Puts a removed row back, whole: an ordinary create carrying every field the delete handed
 * back, `acquiredAt` among them, so the copy does not claim to have been pulled today.
 *
 * The row that comes back has a new id. Nothing outside the row refers to one, and the screen
 * that offered the undo has moved on by the time it lands.
 */
export async function restoreCard(input: RemovedCard): Promise<Result> {
    const parsed = removedCardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That card cannot be put back." };

    const c = parsed.data;
    try {
        await api("/cards", {
            method: "POST",
            body: {
                name: c.name,
                set: c.setName,
                number: c.number,
                types: c.types ?? [],
                // `collection` is the API's word for owned; a wish goes back to the wishlist.
                collection: c.owned,
                ...(c.rarity ? { rarity: c.rarity } : {}),
                ...(c.gen ? { gen: c.gen } : {}),
                ...(c.finish ? { finish: c.finish } : {}),
                ...(c.foilPattern ? { foilPattern: c.foilPattern } : {}),
                ...(c.quantity ? { quantity: c.quantity } : {}),
                ...(c.condition ? { condition: c.condition } : {}),
                ...(c.grade ? { grade: c.grade } : {}),
                ...(c.language ? { language: c.language } : {}),
                ...(c.purchasePrice != null ? { purchasePrice: c.purchasePrice } : {}),
                ...(c.purchaseDate ? { purchaseDate: c.purchaseDate } : {}),
                ...(c.notes ? { notes: c.notes } : {}),
                ...(c.isFavorite ? { isFavorite: true } : {}),
                ...(c.excluded ? { excluded: true } : {}),
                ...(c.acquiredAt ? { acquiredAt: c.acquiredAt } : {}),
                ...(c.collectionId ? { collectionId: c.collectionId } : {}),
            },
        });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// Moves a wishlist card into the owned collection (the person acquired it).
export async function markOwned(cardId: string): Promise<Result> {
    const parsed = z.string().uuid().safeParse(cardId);
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data}`, { method: "PATCH", body: { owned: true } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// A star on a card you own. The API keeps the flag; the favorites list and the card sheet read it.
export async function setFavorite(cardId: string, isFavorite: boolean): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), isFavorite: z.boolean() }).safeParse({ cardId, isFavorite });
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { isFavorite: parsed.data.isFavorite } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

/** One reading of a card's price, from GET /v1/cards/{tcgId}/prices. Euros; null where Cardmarket published nothing. */
export type PricePoint = { date: string; market: number | null; holo: number | null };

// A card's price day by day over the last ninety days, for the sheet. Empty, not an error, for a
// card with no readings yet; and empty when the API cannot answer, since the sheet is open for
// the card, not for its line.
export async function cardPriceHistory(tcgId: string): Promise<PricePoint[]> {
    try {
        const { points } = await api(`/cards/${encodeURIComponent(tcgId)}/prices`, { schema: pricePointsAnswer });
        return points;
    } catch (err) {
        console.error("Price history unavailable:", err instanceof Error ? err.message : err);
        return [];
    }
}

// A generation's logo: the earliest set of that series that carries one and is not a promo
// set, from the shelf the Browse page already reads. Null where the series is unknown.
export async function seriesLogo(series: string): Promise<string | null> {
    try {
        const shelf = await getSets();
        const found = shelf.series.find((s) => s.name === series);
        if (!found) return null;
        const sets = [...found.sets]
            .filter((s) => s.logoUrl && !/promo/i.test(s.name))
            .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
        return sets[0]?.logoUrl ?? null;
    } catch {
        return null;
    }
}

// Every row of one card the person holds: the set and number name it, the name confirms it
// (two cards of one number in one set do not happen, but the check costs nothing).
export async function listCopies(card: CardName): Promise<Card[]> {
    return (await listRows(card)).filter((c) => c.owned);
}

/**
 * Every row of this card, held or wished for. For opening a sheet on a card the page knows only
 * from the catalogue: the row carries the id every action in the sheet's bar needs. `listCopies`
 * left a wish out, so a wished card opened on the catalogue's card and "Remove from wishlist"
 * answered "Invalid card", on a set page as in the search.
 */
export async function listRows(card: CardName): Promise<Card[]> {
    const set = card.set_name ?? card.set;
    if (!set || !card.number) return [];
    try {
        // The API lists the collection or the wishlist, never both in one answer, and takes the
        // set by its official name (the title) or the name a card was filed under.
        const ask = { set, number: card.number, facets: false, limit: 100 } as const;
        const [held, wished] = await Promise.all([getMyCards(ask), getMyCards({ ...ask, wishlist: true })]);
        return [...held.cards, ...wished.cards].filter((c) => sameCard(c, card));
    } catch (err) {
        console.error("Copies unavailable:", err instanceof Error ? err.message : err);
        return [];
    }
}

const copyBody = z.object({ cardId: z.string().uuid(), count: z.number().int().min(1).max(999), edits: copyEdits });

// One more copy of a row, as a row of its own, with these differences (none is one more of the same).
export async function addCopy(cardId: string, edits: CopyEdits, count = 1): Promise<Result | { ok: true; id: string }> {
    const parsed = copyBody.safeParse({ cardId, count, edits });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    let id: string | undefined;
    try {
        const res = await api(`/collection/items/${parsed.data.cardId}/copies`, {
            method: "POST",
            body: { ...parsed.data.edits, count: parsed.data.count },
            schema: copyAnswer,
        });
        id = res.card?.id ?? undefined;
    } catch (err) {
        return failed(err);
    } finally {
        // The row is inserted before the answer is parsed, so an answer this app cannot read
        // (ApiShapeError) is still a copy that exists. The cache goes whatever the POST returned.
        await forgetMine();
    }
    return id ? { ok: true, id } : { ok: true };
}

// Some of a row's copies as a row of their own: the row loses `count`, the copy keeps the row's acquired date.
export async function splitCopy(cardId: string, edits: CopyEdits, count = 1): Promise<Result> {
    const parsed = copyBody.safeParse({ cardId, count, edits });
    if (!parsed.success || Object.keys(parsed.data.edits).length === 0) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}/split`, { method: "POST", body: { ...parsed.data.edits, count: parsed.data.count } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

/** What the catalogue knows about a printing beyond what the row carries (GET /v1/cards/{tcgId}). */
export type CardFacts = {
    illustrator: string | null;
    hp: number | null;
    stage: string | null;
    evolveFrom: string | null;
    regulationMark: string | null;
    /** Cardmarket's page for the card. */
    cmUrl: string | null;
    /** The Western languages the card was printed in; a copy can be one of these and no other. */
    languages: string[];
    /**
     * Every printing of this card that exists: what each one is, and what its foil looks like.
     * A form offers no finish and no pattern that is not here, and offers everything where the
     * list is empty, because empty is the catalogue having no answer rather than none existing.
     */
    printings: { finish: "normal" | "holo" | "reverse-holo"; foilPattern: string | null }[];
    /** The catalogue's own price for the printing: the market figure, its floor and its Near Mint band. */
    price: { low: number | null; market: number | null; avg30: number | null; nm: { low: number; mid: number; high: number } | null } | null;
    /** Cardmarket's averages: the all-time average, the trend, and the last seven days. */
    market: { avg: number | null; trend: number | null; avg7: number | null } | null;
};

// The card's facts for the sheet: the illustrator, HP, stage, regulation mark, the Cardmarket page
// and what the catalogue says the printing is worth. Null when the catalogue cannot answer; the
// sheet is open for the row, not for these.
export async function cardFacts(tcgId: string): Promise<CardFacts | null> {
    try {
        const c = await api(`/cards/${encodeURIComponent(tcgId)}`, { schema: cardFactsAnswer });
        return {
            illustrator: c.illustrator ?? null,
            hp: c.hp ?? null,
            stage: c.stage ?? null,
            evolveFrom: c.evolveFrom ?? null,
            regulationMark: c.regulationMark ?? null,
            cmUrl: c.cmUrl ?? null,
            languages: Array.isArray(c.languages) ? c.languages : ["en"],
            printings: Array.isArray(c.printings) ? c.printings : [],
            price: c.price ?? null,
            market: c.market ?? null,
        };
    } catch (err) {
        console.error("Card facts unavailable:", err instanceof Error ? err.message : err);
        return null;
    }
}

// One copy's own facts, whichever of them changed: the same PATCH that marks a wish owned, so a
// copy's card in the sheet edits every field the add form asks for, and nothing is left read-only
// for want of an action of its own. The API takes only what is sent; a field left out stays.
//
// Every row of the kind in one call: four identical copies are four rows in the store, and
// "these are Near Mint" said row by row was four round trips through Next's one-at-a-time
// action queue. The API takes the ids beside the fields and changes them in one statement.
export async function editCopies(cardIds: string[], edits: CopyEdits): Promise<Result> {
    const parsed = z.object({ cardIds: z.array(z.string().uuid()).min(1).max(100), edits: copyEdits }).safeParse({ cardIds: [...new Set(cardIds)], edits });
    if (!parsed.success || Object.keys(parsed.data.edits).length === 0) return { ok: false, error: "Invalid input." };
    try {
        await api("/collection/items", { method: "PATCH", body: { ids: parsed.data.cardIds, ...parsed.data.edits } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

// A wish becomes a copy you hold, with what is known about it at once: language, condition or
// grade, finish, folder, purchase price and the day you got it (today unless said). One PATCH.
export async function markOwnedWith(cardId: string, edits: CopyEdits): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), edits: copyEdits }).safeParse({ cardId, edits });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}`, {
            method: "PATCH",
            body: { owned: true, acquiredAt: new Date().toISOString(), ...parsed.data.edits },
        });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}
