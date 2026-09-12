"use server";

import { isBrowseProgress, shelfCounts } from "@/lib/browse-query";
import { BROWSE_LANGUAGES, type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";
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

/**
 * The numbers beside Browse's filters, for the choices as they stand in the sheet: per progress,
 * the sets this catalogue would show; per language, the sets that catalogue would show with this
 * progress. Each catalogue is the read Browse makes anyway, kept five minutes per person; if one is
 * not answering, the languages carry no numbers rather than a zero.
 */
export async function countShelf(input: { language: string; progress: string; q?: string }): Promise<{
    total: number | null;
    progress: Record<string, number>;
    /** Absent when any catalogue did not answer: a missing number reads as none left, which it is not. */
    language?: Record<string, number>;
}> {
    const language = isBrowseLanguage(input.language) ? input.language : "en";
    const progress = isBrowseProgress(input.progress) ? input.progress : "all";
    const q = typeof input.q === "string" ? input.q.slice(0, 100) : undefined;
    const read = async (code: BrowseLanguage) => {
        try {
            return shelfCounts((await getSets(code)).series, q, progress);
        } catch {
            return null;
        }
    };
    const answers = await Promise.all(BROWSE_LANGUAGES.map(async (l) => [l.code, await read(l.code)] as const));
    const here = answers.find(([code]) => code === language)?.[1] ?? null;
    return {
        total: here?.total ?? null,
        progress: here?.progress ?? {},
        language: answers.every(([, answer]) => answer) ? Object.fromEntries(answers.map(([code, answer]) => [code, answer!.total])) : undefined,
    };
}
