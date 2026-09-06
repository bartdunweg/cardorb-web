"use client";

import { FlagIcon } from "@/components/app/flag-icon";
import { BROWSE_LANGUAGES, type BrowseLanguage } from "@/lib/languages";
import { cx } from "@/utils/cx";

// The catalogues a person can browse, as a row of flags: English, Japanese, Chinese (traditional
// and simplified), Korean. One pressed; the name is read out, the flag is what is seen.
export function LanguageChips({ value, onChange, className }: { value: BrowseLanguage; onChange: (next: BrowseLanguage) => void; className?: string }) {
    return (
        <fieldset className={cx("scrollbar-hide flex gap-1 overflow-x-auto", className)}>
            <legend className="sr-only">Catalogue language</legend>
            {BROWSE_LANGUAGES.map((l) => (
                <button
                    key={l.code}
                    type="button"
                    aria-pressed={l.code === value}
                    aria-label={l.label}
                    onClick={() => onChange(l.code)}
                    className={cx(
                        "flex pressable items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold outline-focus-ring transition-colors duration-150 focus-visible:outline-2",
                        l.code === value ? "bg-alpha-black/8 text-primary" : "text-tertiary hover:text-secondary",
                    )}
                >
                    <FlagIcon language={l.code} labelled />
                    <span aria-hidden="true">{l.short}</span>
                </button>
            ))}
        </fieldset>
    );
}
