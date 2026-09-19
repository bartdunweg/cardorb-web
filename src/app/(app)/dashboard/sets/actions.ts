"use server";

import { isBrowseProgress, listParam, shelfCounts, yearParam } from "@/lib/browse-query";
import { type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";
import { CatalogueUnavailable, type SetSeries, getShelf } from "@/lib/sets";

// The shelf for the search sheet: every series with its sets and the person's counts, the
// same read Browse makes (cached per person for five minutes). Empty when the catalogue is
// not answering; the sheet then says so rather than showing nothing at all.
export async function listSetsShelf(language: BrowseLanguage = "en"): Promise<{ series: SetSeries[]; unavailable: boolean }> {
    try {
        const { series } = await getShelf(isBrowseLanguage(language) ? language : "en");
        return { series, unavailable: false };
    } catch (err) {
        if (err instanceof CatalogueUnavailable) return { series: [], unavailable: true };
        console.error("Shelf unavailable:", err instanceof Error ? err.message : err);
        return { series: [], unavailable: true };
    }
}

/** What a count answers: the sets the choices show, and per option what that one would show. Empty where the shelf did not answer. */
export type ShelfCount = { total: number | null; progress: Record<string, number>; series: Record<string, number>; year: Record<string, number> };

/**
 * The numbers beside Browse's filters, for the choices as they stand in the sheet: the sets this
 * catalogue would show, and per progress, series and year what that choice would leave with the
 * others as they are. The catalogue's shelf is the read Browse makes anyway, kept five minutes per
 * person. The language is the tabs' now, not a filter, so only the chosen catalogue is read.
 */
export async function countShelf(input: { language: string; progress: string; q?: string; series?: string[]; year?: string[] }): Promise<ShelfCount> {
    const language = isBrowseLanguage(input.language) ? input.language : "en";
    const progress = isBrowseProgress(input.progress) ? input.progress : "all";
    const q = typeof input.q === "string" ? input.q.slice(0, 100) : undefined;
    try {
        const { series } = await getShelf(language);
        return shelfCounts(series, { q, progress, series: listParam(input.series), year: yearParam(input.year) });
    } catch {
        return { total: null, progress: {}, series: {}, year: {} };
    }
}
