"use client";

import { FlagIcon } from "@/components/app/flag-icon";
import { NativeSelect } from "@/components/base/select/select-native";
import { languagesFor } from "@/lib/languages";
import { cx } from "@/utils/cx";

/**
 * Picking a language, with its flag beside it.
 *
 * The flag and the select had been assembled by hand in three places — the copy form, the
 * mark-owned form and the card sheet's own row — and the three had already drifted: two put the
 * flag inside the box and one beside it, on different sizes. A language is one control, so it is
 * one component.
 *
 * `printed` is what the catalogue says this card exists in. Empty or absent means "no answer",
 * and then every language is offered rather than none — the same rule the finish and pattern
 * pickers follow. A language already recorded is always kept, whatever the catalogue claims,
 * because a select whose value is not among its options shows blank and would clear an answer
 * somebody gave on purpose.
 */
export function LanguageSelect({
    value,
    onChange,
    printed,
    inside = true,
    className,
}: {
    value: string;
    onChange: (code: string) => void;
    /** The languages the card was printed in, when the API has said. */
    printed?: readonly string[] | null;
    /** The flag sits in the box; false puts it in front, for a row that is read rather than filled. */
    inside?: boolean;
    className?: string;
}) {
    const select = (
        <NativeSelect
            aria-label="Language"
            size="sm"
            // Room for the flag sitting inside the box.
            selectClassName={inside ? "pl-9" : undefined}
            className={inside ? "w-full" : "w-auto"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            options={languagesFor(value, printed).map((l) => ({ label: l.label, value: l.code }))}
        />
    );

    return inside ? (
        <span className={cx("relative block", className)}>
            <FlagIcon language={value} size="md" className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2" />
            {select}
        </span>
    ) : (
        <span className={cx("flex items-center justify-end gap-2", className)}>
            <FlagIcon language={value} size="md" labelled />
            {select}
        </span>
    );
}
