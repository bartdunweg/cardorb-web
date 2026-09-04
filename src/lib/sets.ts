import { ApiError, api } from "@/lib/api";
import { type BrowseCard, type CatalogueSet, type SetCard, absoluteImage, seriesFromSets, setCardFromBrowse } from "@/lib/api-shapes";

export type { SetCard, SetSeries, SetSummary } from "@/lib/api-shapes";

/** The catalogue is down (the API answers 502): a page shows that rather than an empty shelf. */
export class CatalogueUnavailable extends Error {
    constructor() {
        super("The catalogue is not answering.");
        this.name = "CatalogueUnavailable";
    }
}

const catalogueDown = (err: unknown) => err instanceof ApiError && err.status === 502;

// Every set there is, grouped by series, with how much of each is in the binder. The API lists
// them newest first and the groups keep that order.
export async function getSets() {
    try {
        const { sets } = await api<{ sets: CatalogueSet[] }>("/catalog/sets");
        return seriesFromSets(sets);
    } catch (err) {
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}

/** The catalogue's page ceiling; one request brings the whole set, so the grid needs no paging. */
const WHOLE_SET = 250;

export type SetDetail = {
    id: string;
    name: string;
    series: string;
    releaseDate: string | null;
    logoUrl: string | null;
    total: number;
    /** Distinct cards held, over the whole set. */
    owned: number;
    cards: SetCard[];
};

// One set, every card in set order, the viewer's own marked. Null when no catalogue carries the id.
export async function getSet(id: string): Promise<SetDetail | null> {
    try {
        const { set, cards, totalCount, ownedCount } = await api<{
            set: Omit<CatalogueSet, "ownedCount" | "wishlistCount">;
            cards: BrowseCard[];
            totalCount: number;
            ownedCount: number;
        }>(`/catalog/sets/${encodeURIComponent(id)}`, { params: { pageSize: WHOLE_SET } });
        return {
            id: set.id,
            name: set.name,
            series: set.series,
            releaseDate: set.releaseDate,
            logoUrl: absoluteImage(set.logo),
            total: totalCount,
            owned: ownedCount,
            cards: cards.map(setCardFromBrowse),
        };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}
