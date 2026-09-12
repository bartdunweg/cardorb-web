import { ApiError, api } from "@/lib/api";
import {
    type BrowseCard,
    type CatalogueSet,
    type SetCard,
    absoluteImage,
    catalogueSetsAnswer,
    seriesFromSets,
    setCardFromBrowse,
    setPageAnswer,
} from "@/lib/api-shapes";
import type { BrowseLanguage } from "@/lib/languages";
import { logoColors } from "@/lib/logo-color";
import { perUser } from "@/lib/user-cache";

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
// Five minutes per person (user-cache.ts): the counts on the tiles change on a write, and every
// write drops the person's entries.
export async function getSets(language: BrowseLanguage = "en") {
    try {
        const sets = await perUser(
            `sets:${language}`,
            async (token) => (await api("/catalog/sets", { token, params: language === "en" ? {} : { language }, schema: catalogueSetsAnswer })).sets,
        );
        const shelf = seriesFromSets(sets);
        // Every tile wears its logo's colour. Read once per logo and kept a month, so only the first
        // shelf after a deploy pays for the reads; they run side by side, a bounded number at a time.
        const all = shelf.series.flatMap((group) => group.sets);
        const colors = await logoColors(all.map((set) => set.logoUrl));
        all.forEach((set, i) => {
            set.color = colors[i] ?? null;
        });
        return shelf;
    } catch (err) {
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}

/** The catalogue's page ceiling. A set larger than this takes a second request, and a third. */
const PAGE = 250;

export type SetDetail = {
    id: string;
    name: string;
    localName: string | null;
    series: string;
    releaseDate: string | null;
    logoUrl: string | null;
    total: number;
    /** Distinct cards held, over the whole set. */
    owned: number;
    cards: SetCard[];
};

// One set, every card in set order, the viewer's own marked. Null when no catalogue carries the id.
export async function getSet(id: string, language: BrowseLanguage = "en"): Promise<SetDetail | null> {
    try {
        type Page = {
            set: Omit<CatalogueSet, "ownedCount" | "wishlistCount">;
            cards: BrowseCard[];
            totalCount: number;
            ownedCount: number;
            hasMore: boolean;
        };
        const read = (page: number) =>
            api(`/catalog/sets/${encodeURIComponent(id)}`, {
                params: { pageSize: PAGE, ...(page > 1 ? { page } : {}), ...(language === "en" ? {} : { language }) },
                schema: setPageAnswer,
            });
        // The catalogue answers 250 cards at a time. Most sets fit in one; the ones that do not (a
        // Scarlet & Violet set with its secrets) used to lose their tail silently, under a count that
        // still named the whole set. Pages are read while the API says there are more, ten at most:
        // 2,500 cards is far past any set, and a bug on either side stops rather than loops.
        let answer = await read(1);
        const { set, totalCount, ownedCount } = answer;
        const cards = [...answer.cards];
        for (let page = 2; page <= 10 && answer.hasMore; page++) {
            answer = await read(page);
            cards.push(...answer.cards);
        }
        return {
            id: set.id,
            name: set.name,
            localName: set.localName ?? null,
            series: set.series,
            releaseDate: set.releaseDate,
            logoUrl: absoluteImage(set.logo),
            // The cards read, which is the count every full set answers with; the catalogue's own
            // count where it has recorded none of them yet, so "0 of 60" says what is missing
            // rather than "0 of 0", which says nothing was ever there.
            total: totalCount || set.total,
            owned: ownedCount,
            cards: cards.map(setCardFromBrowse),
        };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}
