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

export type BrowseQuery = {
    language: BrowseLanguage;
    sort: BrowseSort;
    /** What was typed in the row's search field: part of a set's name, or of its local one. */
    q: string | undefined;
};

export type BrowseSearchParams = { language?: string; sort?: string; q?: string };

/** Read forgivingly: nonsense means English, newest first, nothing searched. */
export function readBrowseQuery(params: BrowseSearchParams): BrowseQuery {
    return {
        language: isBrowseLanguage(params.language) ? params.language : "en",
        sort: isBrowseSort(params.sort) ? params.sort : "newest",
        q: params.q?.trim().slice(0, 100) || undefined,
    };
}

/** Browse's URL with some of it changed; defaults stay out so the plain path stays plain. */
export function browseHref(current: BrowseQuery, patch: Partial<BrowseQuery>): string {
    const { language, sort, q } = { ...current, ...patch };
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (language !== "en") p.set("language", language);
    if (sort !== "newest") p.set("sort", sort);
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
