import type { CardFacts, PricePoint } from "@/app/(app)/dashboard/cards/actions";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import type { Mover } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import type { PeriodKey } from "@/lib/chart-periods";
import type { CardName } from "@/lib/copies";
import { type Facets, NO_FACETS } from "@/lib/facets";

/**
 * The reads a screen makes once it is drawn, asked of GET /api/read/* rather than through server
 * actions: Next runs a page's actions one at a time, so a read asked that way held back the next
 * press's write for as long as it took (the route says more). Each answers what the action of the
 * same name answered, and fails as softly: an answer that does not come, for whatever reason,
 * is the action's own fallback, so no caller had to change what it does with one.
 */
async function read<T>(what: string, query: [string, string | null | undefined][], fallback: T): Promise<T> {
    const q = new URLSearchParams();
    for (const [key, value] of query) if (value) q.append(key, value);
    try {
        const res = await fetch(`/api/read/${what}${q.size ? `?${q}` : ""}`);
        if (!res.ok) return fallback;
        return ((await res.json()) as T | null) ?? fallback;
    } catch {
        return fallback;
    }
}

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

export const listCollections = (): Promise<FolderChoice[]> => read("folders", [], []);

export const loadFacets = (): Promise<Facets> => read("facets", [], NO_FACETS);

export const warmList = (list: "collection" | "wishlist" | "favorites"): Promise<void> => read("warm-list", [["list", list]], null).then(() => undefined);

export const moversFor = (period: PeriodKey): Promise<{ up: Mover[]; down: Mover[] } | null> =>
    read<{ up: Mover[]; down: Mover[] } | null>("movers", [["period", period]], null);
