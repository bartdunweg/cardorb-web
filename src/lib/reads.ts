import type {
    CardFacts,
    CardHit,
    CardTitle,
    CatalogueFilters,
    MyCardsFilters,
    PokemonCard,
    PricePoint,
    TitleScope,
    TitleSet,
} from "@/app/(app)/dashboard/cards/actions";
import type { BinderChoice } from "@/app/(app)/dashboard/collections/actions";
import type { FilterCounts, Mover } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import type { PeriodKey } from "@/lib/chart-periods";
import type { CardName } from "@/lib/copies";
import { type Facets, NO_FACETS } from "@/lib/facets";
import type { BrowseLanguage } from "@/lib/languages";
import type { SetSeries } from "@/lib/sets";

/**
 * The reads a screen makes once it is drawn, asked of GET /api/read/* rather than through server
 * actions: Next runs a page's actions one at a time, so a read asked that way held back the next
 * press's write for as long as it took (the route says more). Each answers what the action of the
 * same name answered, and fails the way it did: where the action fell back softly, an answer that
 * does not come, for whatever reason, is its fallback (`read`); where it threw, this throws (`ask`).
 * So no caller had to change what it does with one.
 */
async function read<T>(what: string, query: [string, string | null | undefined][], fallback: T): Promise<T> {
    try {
        return await ask(what, query, fallback);
    } catch {
        return fallback;
    }
}

/**
 * The read for callers whose action threw when the API did not answer: a search box that says the
 * card service did not answer, a list that offers to try again. An address the route refuses (400)
 * is still the fallback, because the action answered an input its schema refused with an empty
 * answer rather than an error.
 */
async function ask<T>(what: string, query: [string, string | null | undefined][], fallback: T): Promise<T> {
    const q = new URLSearchParams();
    for (const [key, value] of query) if (value) q.append(key, value);
    const res = await fetch(`/api/read/${what}${q.size ? `?${q}` : ""}`);
    if (res.status === 400) return fallback;
    if (!res.ok) throw new Error(`The read ${what} answered ${res.status}.`);
    return ((await res.json()) as T | null) ?? fallback;
}

/** A structured input (a list's filter, a search's chips) as one JSON value in the address; the route bounds its length and checks its shape. */
const input = (value: unknown): [string, string] => ["input", JSON.stringify(value)];

/** Only the catalogues the API keeps apart: anything else is English, as the action took it. */
const catalogue = (language?: string | null) => (language === "ja" ? "ja" : null);

export const cardFacts = (tcgId: string, language?: string | null): Promise<CardFacts | null> =>
    read<CardFacts | null>(
        "facts",
        [
            ["id", tcgId],
            ["language", catalogue(language)],
        ],
        null,
    );

export const cardFactsMany = (tcgIds: string[], language?: string | null): Promise<Record<string, CardFacts>> =>
    tcgIds.length
        ? read("facts-many", [...[...new Set(tcgIds)].map((id): [string, string] => ["id", id]), ["language", catalogue(language)]], {})
        : Promise.resolve({});

export const cardPriceHistory = (tcgId: string): Promise<PricePoint[]> => read("prices", [["id", tcgId]], []);

export const seriesLogo = (series: string): Promise<string | null> => read<string | null>("series-logo", [["series", series]], null);

/** Every row of this card, held or wished for. */
export const listRows = (card: CardName): Promise<Card[]> =>
    read(
        "rows",
        [
            ["set", card.set],
            ["number", card.number],
            ["name", card.name],
            ["set_name", card.set_name],
            ["tcg_id", card.tcg_id],
        ],
        [],
    );

/** Every row of this card the person holds. */
export const listCopies = async (card: CardName): Promise<Card[]> => (await listRows(card)).filter((c) => c.owned);

export const listSetRows = (set: string): Promise<Card[] | null> => read<Card[] | null>("set-rows", [["set", set]], null);

export const listBinders = (): Promise<BinderChoice[]> => read("folders", [], []);

export const loadFacets = (): Promise<Facets> => read("facets", [], NO_FACETS);

export const warmList = (list: "collection" | "wishlist" | "favorites"): Promise<void> => read("warm-list", [["list", list]], null).then(() => undefined);

export const moversFor = (period: PeriodKey): Promise<{ up: Mover[]; down: Mover[] } | null> =>
    read<{ up: Mover[]; down: Mover[] } | null>("movers", [["period", period]], null);

/** The next batch of a list on scroll, with the count as of that batch. Throws when the API does not answer, so the list can offer to try again. */
export const loadMoreCards = (filter: unknown): Promise<{ cards: Card[]; total: number }> => ask("more", [input(filter)], { cards: [], total: 0 });

/** How many cards a draft of the Filters sheet finds; null when it cannot say. */
export const countCards = (filter: unknown): Promise<{ total: number; counts: FilterCounts | null } | null> =>
    read<{ total: number; counts: FilterCounts | null } | null>("count", [input(filter)], null);

/** A binder's add-from-collection search. Throws when the API does not answer, which the box says. */
export const searchMyCards = (query: string, filters?: MyCardsFilters): Promise<CardHit[]> => ask("my-cards", [input({ q: query, ...filters })], []);

/** Every title in one binder, for the field to answer its own typing. */
export const collectionIndex = (scope: TitleScope = {}): Promise<{ titles: CardTitle[]; sets: TitleSet[]; complete: boolean }> =>
    ask("title-index", [input(scope)], { titles: [], sets: [], complete: false });

/** The titles under a binder's search field, per term, for a collection too large to hold. */
export const suggestCardTitles = (query: string, scope: TitleScope = {}): Promise<CardTitle[]> => ask("titles", [input({ q: query, ...scope })], []);

/** The catalogue search. Throws when the API does not answer, so the box can say it did not. */
export const searchPokemon = (query: string, filters: CatalogueFilters = {}, page = 1): Promise<{ items: PokemonCard[]; total?: number }> =>
    ask("catalogue", [input({ q: query, ...filters, page })], { items: [] });

/** The shelf of sets for a search sheet; unavailable when the catalogue, or the read, did not answer. */
export const listSetsShelf = (language: BrowseLanguage = "en"): Promise<{ series: SetSeries[]; unavailable: boolean }> =>
    read("sets-shelf", [["language", language]], { series: [], unavailable: true });

/** The numbers beside Browse's filters. Throws when the read does not answer, as the action did; the sheet then shows no numbers. */
export const countShelf = (input: {
    language: string;
    progress: string;
    q?: string;
}): Promise<{ total: number | null; progress: Record<string, number>; language?: Record<string, number> }> =>
    ask(
        "shelf-count",
        [
            ["language", input.language],
            ["progress", input.progress],
            ["q", input.q],
        ],
        { total: null, progress: {} },
    );
