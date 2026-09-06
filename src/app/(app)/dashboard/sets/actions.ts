"use server";

import { type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";
import { CatalogueUnavailable, type SetSeries, getSets } from "@/lib/sets";

// The shelf for the search sheet: every series with its sets and the person's counts, the
// same read Browse makes (cached per person for five minutes). Empty when the catalogue is
// not answering; the sheet then says so rather than showing nothing at all.
export async function listSetsShelf(language: BrowseLanguage = "en"): Promise<{ series: SetSeries[]; unavailable: boolean }> {
    try {
        const { series } = await getSets(isBrowseLanguage(language) ? language : "en");
        return { series, unavailable: false };
    } catch (err) {
        if (err instanceof CatalogueUnavailable) return { series: [], unavailable: true };
        console.error("Shelf unavailable:", err instanceof Error ? err.message : err);
        return { series: [], unavailable: true };
    }
}
