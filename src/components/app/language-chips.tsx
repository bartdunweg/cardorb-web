"use client";

import { Button as AriaButton } from "react-aria-components";
import { FlagIcon } from "@/components/app/flag-icon";
import { BROWSE_LANGUAGES, type BrowseLanguage } from "@/lib/languages";
import { cx } from "@/utils/cx";

// The catalogues a person can browse, as a row of flags (one line; it scrolls sideways where it does not fit;
// a fieldset sizes to its content unless its width is pinned, which is how it once broke onto two lines): English, Japanese, Chinese (traditional
// and simplified), Korean. One pressed; the name is read out, the flag is what is seen.
export function LanguageChips({ value, onChange, className }: { value: BrowseLanguage; onChange: (next: BrowseLanguage) => void; className?: string }) {
    return (
        <fieldset className={cx("scrollbar-hide flex w-full max-w-full min-w-0 flex-nowrap gap-1 overflow-x-auto", className)}>
            <legend className="sr-only">Catalogue language</legend>
            {BROWSE_LANGUAGES.map((l) => (
                // The kit's button (react-aria), which answers Enter and Space itself, as the filter chips do.
                <AriaButton
                    key={l.code}
                    aria-pressed={l.code === value}
                    aria-label={l.label}
                    onPress={() => onChange(l.code)}
                    className={cx(
                        "flex shrink-0 pressable items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap outline-focus-ring transition-colors duration-150 focus-visible:outline-2",
                        l.code === value ? "bg-alpha-black/8 text-primary" : "text-tertiary hover:text-secondary",
                    )}
                >
                    <FlagIcon language={l.code} labelled />
                    <span aria-hidden="true">{l.short}</span>
                </AriaButton>
            ))}
        </fieldset>
    );
}
