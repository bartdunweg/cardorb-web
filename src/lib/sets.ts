import { ApiError, api, session } from "@/lib/api";
import { type SetCard, catalogueSetsAnswer, ownImage, seriesFromSets, setCardFromBrowse, setPageAnswer } from "@/lib/api-shapes";
import { CATALOGUE_TAG } from "@/lib/cache-scopes";
import type { BrowseLanguage } from "@/lib/languages";
import { logoPaletteMap } from "@/lib/logo-color";
import { CATALOGUE_NOT_ANSWERING } from "@/lib/read-failure";
import { perUser } from "@/lib/user-cache";

export type { SetCard, SetSeries, SetSummary } from "@/lib/api-shapes";

/** The catalogue is down (the API answers 502): a page shows that rather than an empty shelf. */
export class CatalogueUnavailable extends Error {
    constructor() {
        super(CATALOGUE_NOT_ANSWERING);
        this.name = "CatalogueUnavailable";
    }
}

const catalogueDown = (err: unknown) => err instanceof ApiError && err.status === 502;

// Every set there is, grouped by series, with how much of each is in the binder. The API lists
// them newest first and the groups keep that order.
// Five minutes per person (user-cache.ts): the counts on the tiles change on a write, and every
// write drops the person's entries.
//
// Without the logos' colours: a tab title, the counts beside Browse's filters, the search sheet and
// a generation's logo in the card sheet read this and draw no tile. `getSets` is the shelf with them.
export async function getShelf(language: BrowseLanguage = "en") {
    const params = language === "en" ? {} : { language };
    try {
        /*
         * Two roads, and which one is taken is the session's answer, not the caller's.
         *
         * Signed in, the counts on these tiles are this person's, so the entry is theirs: perUser
         * keys it by them and a write of theirs forgets it. Signed out the answer carries nobody's
         * counts, so every visitor shares one entry under the catalogue's tag. That is not only
         * cheaper, it is the only correct filing: an answer with no person in it has no person to
         * be filed under.
         */
        const mine = await session();
        const sets = mine
            ? await perUser("sets", `sets:${language}`, async (token) => (await api("/catalog/sets", { token, params, schema: catalogueSetsAnswer })).sets)
            : (await api("/catalog/sets", { auth: "optional", params, tags: [CATALOGUE_TAG], schema: catalogueSetsAnswer })).sets;
        return seriesFromSets(sets);
    } catch (err) {
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}

// The shelf as Browse draws it: every tile wears its logo's colours. Read once per logo and kept a
// month, and a whole shelf's answers kept together (logoPaletteMap), so a warm shelf costs one cache
// read for its colours rather than one per logo. The sets are copied rather than written into: the
// shelf under them is the request's one shared read (perUser), which `getShelf` hands out too.
export async function getSets(language: BrowseLanguage = "en") {
    const shelf = await getShelf(language);
    const palettes = await logoPaletteMap(shelf.series.flatMap((group) => group.sets.map((set) => set.logoUrl)));
    return {
        ...shelf,
        series: shelf.series.map((group) => ({
            ...group,
            sets: group.sets.map((set) => ({ ...set, colors: (set.logoUrl ? palettes[set.logoUrl] : undefined) ?? [] })),
        })),
    };
}

/**
 * The API's page ceiling since 2026-09-14, past any set with its gallery, so a set is one request.
 * It was 250, and a Scarlet & Violet set took two in a row, each reading the whole set again on
 * the API's side: 1.4 s and then 0.7 s more, measured. An API still clamping to 250 answers
 * `hasMore` and the loop below reads the rest, so this side does not wait on that deploy.
 */
const PAGE = 500;

export type SetDetail = {
    id: string;
    name: string;
    localName: string | null;
    series: string;
    releaseDate: string | null;
    logoUrl: string | null;
    total: number;
    /** The set's gallery, whose cards are part of `total`. */
    gallery: { name: string; total: number } | null;
    /** Distinct cards held, over the whole set; null where nobody was asked (a reader without a session). */
    owned: number | null;
    cards: SetCard[];
};

// One set, every card in set order, the viewer's own marked. Null when no catalogue carries the id.
// The `setPages` part is the id asked for, not the canonical one the API answers with: a caller
// that wants to forget this page must name the id it was read under. A set whose gallery the API
// folds in (a Trainer Gallery, a Shiny Vault) still answers its own address as well, and those two
// pages are two parts: a press on one leaves the other's five minutes standing. That is the one
// place the narrowing is not exact, and it costs a stale count on a page you are not looking at.
// Five minutes per person (user-cache.ts): the marks and counts change on a write. Kept per set
// (the `setPages` scope, parted by id), so a card write that names its set drops that set's page and
// leaves every other one standing; a write that cannot name a set drops them all. It was read fresh
// on every visit, and opening a set
// a second time waited on the API as long as the first (2.2 s measured on Scarlet & Violet). A 404
// or a refusal throws inside the cache and is never kept. The "v2" is for when SetDetail's shape
// changes: an entry survives a deploy (#206). The day the change is read from is in the key too, so
// yesterday's entry does not answer with yesterday's week (a price day in every price key).
export async function getSet(id: string, language: BrowseLanguage = "en"): Promise<SetDetail | null> {
    const from = weekAgo();
    try {
        // As the shelf above: the reader's own page is filed under them, a visitor's under the
        // catalogue, because it holds nothing that is anyone's.
        const mine = await session();
        return mine
            ? await perUser({ scope: "setPages", part: id }, `set:v2:${language}:${from}:${id}`, (token) => readSet(id, language, from, token))
            : await readSet(id, language, from, null);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}

/** Seven days back, the window a set tile's price change covers (Bart's call, 2026-09-18), as the API's date. */
const weekAgo = () => new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

async function readSet(id: string, language: BrowseLanguage, from: string, token: string | null): Promise<SetDetail> {
    const read = (page: number) =>
        api(`/catalog/sets/${encodeURIComponent(id)}`, {
            // Null is a visitor: the call is made without a token and the API answers the set
            // without a mark on it (auth "optional" in api.ts).
            ...(token ? { token } : { auth: "optional" as const, tags: [CATALOGUE_TAG] }),
            params: { pageSize: PAGE, from, ...(page > 1 ? { page } : {}), ...(language === "en" ? {} : { language }) },
            schema: setPageAnswer,
        });
    // The ones that do not fit one page (a Scarlet & Violet set with its secrets, when the ceiling
    // was 250) used to lose their tail silently, under a count that still named the whole set.
    // Pages are read while the API says there are more, ten at most: far past any set, and a bug
    // on either side stops rather than loops.
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
        logoUrl: ownImage(set.logo),
        // The cards read, which is the count every full set answers with; the catalogue's own
        // count where it has recorded none of them yet, so "0 of 60" says what is missing
        // rather than "0 of 0", which says nothing was ever there.
        total: totalCount || set.total,
        gallery: set.gallery ?? null,
        owned: ownedCount ?? null,
        cards: cards.map((c) => setCardFromBrowse(c, set.abbreviation ?? null)),
    };
}
