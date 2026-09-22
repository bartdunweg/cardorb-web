import type { SetSeries } from "@/lib/api-shapes";
import { type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";

/**
 * What Browse reads from its URL and how it writes one back: the catalogue's language and the
 * shelf's order, both in the query string so the page is a link that comes back the same.
 */

/** The shelf's orders. The API lists sets newest first and the series keep that order; the rest is turned here. */
export const BROWSE_SORT_OPTIONS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name", label: "Name" },
] as const;

export type BrowseSort = (typeof BROWSE_SORT_OPTIONS)[number]["value"];
export const isBrowseSort = (v: unknown): v is BrowseSort => BROWSE_SORT_OPTIONS.some((o) => o.value === v);

/**
 * How far along a set is: the question Browse is for, "which sets am I finishing". Started is
 * some cards and not all; a set the catalogue counts no cards for is none of the three.
 */
export const BROWSE_PROGRESS_OPTIONS = [
    { value: "all", label: "All sets" },
    { value: "started", label: "In progress" },
    { value: "complete", label: "Complete" },
    { value: "new", label: "Not started" },
] as const;

export type BrowseProgress = (typeof BROWSE_PROGRESS_OPTIONS)[number]["value"];
export const isBrowseProgress = (v: unknown): v is BrowseProgress => BROWSE_PROGRESS_OPTIONS.some((o) => o.value === v);

export type BrowseQuery = {
    language: BrowseLanguage;
    sort: BrowseSort;
    progress: BrowseProgress;
    /** What was typed in the row's search field: part of a set's name, or of its local one. */
    q: string | undefined;
    /** Series to keep (Scarlet & Violet, Sword & Shield); none is every series. */
    series: string[];
    /** Release years to keep, as four digits; none is every year. */
    year: string[];
};

export type BrowseSearchParams = { language?: string; sort?: string; progress?: string; q?: string; series?: string | string[]; year?: string | string[] };

const isYear = (v: string) => /^\d{4}$/.test(v);

/** A repeated parameter as a list, trimmed, bounded and without repeats. */
export const listParam = (value: string | string[] | undefined, keep: (v: string) => boolean = () => true): string[] =>
    [...new Set((Array.isArray(value) ? value : value ? [value] : []).map((v) => v.trim().slice(0, 100)).filter((v) => v && keep(v)))].slice(0, 50);

/** The year list's own check, for a list read from anywhere else. */
export const yearParam = (value: string | string[] | undefined) => listParam(value, isYear);

/** Read forgivingly: nonsense means English, newest first, every set, nothing searched. */
export function readBrowseQuery(params: BrowseSearchParams): BrowseQuery {
    return {
        language: isBrowseLanguage(params.language) ? params.language : "en",
        sort: isBrowseSort(params.sort) ? params.sort : "newest",
        progress: isBrowseProgress(params.progress) ? params.progress : "all",
        q: params.q?.trim().slice(0, 100) || undefined,
        series: listParam(params.series),
        year: yearParam(params.year),
    };
}

/** Browse's URL with some of it changed; defaults stay out so the plain path stays plain. */
export function browseHref(current: BrowseQuery, patch: Partial<BrowseQuery>): string {
    const { language, sort, progress, q, series, year } = { ...current, ...patch };
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (language !== "en") p.set("language", language);
    if (sort !== "newest") p.set("sort", sort);
    if (progress !== "all") p.set("progress", progress);
    for (const name of series) p.append("series", name);
    for (const y of year) p.append("year", y);
    const s = p.toString();
    return s ? `/dashboard/sets?${s}` : "/dashboard/sets";
}

/**
 * The shelf narrowed to what was typed: a set whose name, or whose local name, has the term in
 * it, case aside; a series with none left goes. Nothing typed is the whole shelf.
 */
export function searchShelf(series: SetSeries[], q: string | undefined): SetSeries[] {
    const needle = q?.trim().toLowerCase();
    if (!needle) return series;
    return series
        .map((group) => ({ ...group, sets: group.sets.filter((s) => `${s.name} ${s.localName ?? ""}`.toLowerCase().includes(needle)) }))
        .filter((group) => group.sets.length > 0);
}

/**
 * Whether this shelf carries the reader's own holdings. A shelf read without a session carries
 * none, and "how far along" then has nobody to be about (`seriesFromSets`).
 */
export const shelfHasHoldings = (series: SetSeries[]): boolean => series.some((group) => group.sets.some((s) => s.owned !== null));

/**
 * The shelf narrowed to how far along each set is; a series with none left goes. All is the whole shelf.
 *
 * Nothing marked, so nobody was asked: the shelf comes back whole. Progress is a claim about the
 * reader, and with no reader every set would fail every choice, which empties the shelf and tells
 * a visitor their collection is untouched. A filter about you narrows nothing when there is no you.
 * The filter itself is left out of the row in that case (`browse-toolbar.tsx`), so this holds the
 * line only for a `?progress=` that arrived in a shared address.
 */
export function progressShelf(series: SetSeries[], progress: BrowseProgress): SetSeries[] {
    if (progress === "all" || !shelfHasHoldings(series)) return series;
    const keep = (s: SetSeries["sets"][number]) =>
        s.owned !== null &&
        s.total > 0 &&
        (progress === "complete" ? s.owned >= s.total : progress === "started" ? s.owned > 0 && s.owned < s.total : s.owned === 0);
    return series.map((group) => ({ ...group, sets: group.sets.filter(keep) })).filter((group) => group.sets.length > 0);
}

/**
 * The shelf in the chosen order. Newest first is the API's own. Oldest first turns it around,
 * the series and the sets in each: Base first, and inside a series its first set first. Name
 * drops the series: one list, A to Z, as a group with no name so the page draws no heading.
 */
export function sortShelf(series: SetSeries[], sort: BrowseSort): SetSeries[] {
    if (sort === "oldest") return [...series].reverse().map((group) => ({ ...group, sets: [...group.sets].reverse() }));
    if (sort === "name") {
        const sets = series.flatMap((group) => group.sets).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
        return sets.length ? [{ name: "", sets }] : [];
    }
    return series;
}

/** The shelf narrowed to the chosen series; a series not chosen goes. None chosen is the whole shelf. */
export function seriesShelf(series: SetSeries[], chosen: string[]): SetSeries[] {
    if (chosen.length === 0) return series;
    return series.filter((group) => chosen.includes(group.name));
}

/** The year a set came out, as four digits; a set with no date has none. */
export const setYear = (set: SetSeries["sets"][number]): string | null => {
    const y = set.releaseDate?.slice(0, 4);
    return y && isYear(y) ? y : null;
};

/** The shelf narrowed to sets that came out in one of the chosen years; a series with none left goes. */
export function yearShelf(series: SetSeries[], chosen: string[]): SetSeries[] {
    if (chosen.length === 0) return series;
    return series.map((group) => ({ ...group, sets: group.sets.filter((s) => chosen.includes(setYear(s) ?? "")) })).filter((group) => group.sets.length > 0);
}

/** What the Series and Year filters offer, and whether the Progress filter has anything to be about. */
export type ShelfFacets = { series: string[]; years: string[]; holdings: boolean };

/** Nothing offered yet: the filters show what the URL already names until the shelf answers. */
export const NO_SHELF_FACETS: ShelfFacets = { series: [], years: [], holdings: false };

/** What the Series and Year filters offer for a shelf: its series in the shelf's own order, its years newest first. */
export function shelfFacets(series: SetSeries[]): ShelfFacets {
    const years = new Set<string>();
    for (const group of series)
        for (const set of group.sets) {
            const y = setYear(set);
            if (y) years.add(y);
        }
    return {
        series: series.map((group) => group.name).filter(Boolean),
        years: [...years].sort((a, b) => b.localeCompare(a)),
        holdings: shelfHasHoldings(series),
    };
}

/** Every narrowing Browse's shelf takes after the search, in one place, for the page and for the counts. */
export function narrowShelf(series: SetSeries[], { progress, series: chosen, year }: Pick<BrowseQuery, "progress" | "series" | "year">): SetSeries[] {
    return progressShelf(yearShelf(seriesShelf(series, chosen), year), progress);
}

const countSets = (series: SetSeries[]) => series.reduce((n, group) => n + group.sets.length, 0);

/**
 * How many sets a shelf shows, and per option how many it would with that one chosen and the other
 * filters as they are: the numbers beside Browse's filters. Over the shelf after the search, so
 * they answer what is typed.
 */
export function shelfCounts(
    series: SetSeries[],
    query: Pick<BrowseQuery, "q" | "progress" | "series" | "year">,
): { total: number; progress: Record<BrowseProgress, number>; series: Record<string, number>; year: Record<string, number> } {
    const searched = searchShelf(series, query.q);
    const byProgress = Object.fromEntries(
        BROWSE_PROGRESS_OPTIONS.map((o) => [o.value, countSets(narrowShelf(searched, { ...query, progress: o.value }))]),
    ) as Record<BrowseProgress, number>;
    const bySeries = Object.fromEntries(narrowShelf(searched, { ...query, series: [] }).map((group) => [group.name, group.sets.length]));
    const byYear: Record<string, number> = {};
    for (const group of narrowShelf(searched, { ...query, year: [] }))
        for (const set of group.sets) {
            const y = setYear(set);
            if (y) byYear[y] = (byYear[y] ?? 0) + 1;
        }
    return { total: byProgress[query.progress], progress: byProgress, series: bySeries, year: byYear };
}
