"use client";

import { FilterChip } from "@/components/app/filter-chip";
import { BROWSE_LANGUAGES, type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";

/**
 * Which catalogue to read: English, or one of the four TCGdex keeps in its own script. The kit's
 * filter chip, as Set and Type are, wherever a shelf or a search can change language (Bart's call:
 * a filter like the others, not a row of flags). English is the default and reads as the chip's
 * label with nothing chosen; another catalogue names itself on the chip.
 */
export function LanguageFilterChip({ value, onChange }: { value: BrowseLanguage; onChange: (next: BrowseLanguage) => void }) {
    return (
        <FilterChip
            label="Language"
            any="English"
            value={value === "en" ? undefined : value}
            options={BROWSE_LANGUAGES.filter((l) => l.code !== "en").map((l) => ({ value: l.code, label: l.label }))}
            onChange={(next) => onChange(isBrowseLanguage(next) ? next : "en")}
        />
    );
}
