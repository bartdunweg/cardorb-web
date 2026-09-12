"use client";

import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { RARITY_SPLITS, SPLIT_RARITY } from "@/lib/folder-rule";

// A list of boxes for what fills a Pokédex: the rarities you hold a card of.
// None ticked is every card. Boxes rather than a select: several are meant to be on at once, and
// a person should see at a glance which.
function CheckPicker({
    label,
    options,
    selected,
    onChange,
    none,
    loading,
    isLoading,
}: {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    /** What none ticked means: "Every card, whatever its rarity." */
    none: string;
    /** What the wait says, shown under the spinner while `isLoading`. */
    loading?: string;
    isLoading?: boolean;
}) {
    const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    const has = (v: string) => selected.some((s) => same(s, v));
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium text-secondary">{label}</legend>
            <p className="text-sm text-tertiary">{selected.length ? `${selected.length} of ${options.length}.` : none}</p>
            {options.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {options.map((o) => (
                        <Checkbox
                            key={o.value}
                            label={o.label}
                            isSelected={has(o.value)}
                            onChange={(on) =>
                                onChange(on ? [...selected.filter((s) => !same(s, o.value)), o.value] : selected.filter((s) => !same(s, o.value)))
                            }
                        />
                    ))}
                </div>
            ) : isLoading && loading ? (
                /* The rarities are still on their way. The kit's indicator rather than the words alone: an
                   empty fieldset with a grey line in it read as a list with nothing to offer. */
                <LoadingIndicator size="sm" label={loading} className="py-4" />
            ) : (
                <p className="text-sm text-tertiary">Nothing to choose from.</p>
            )}
        </fieldset>
    );
}

/**
 * The rarities the collection holds, in the catalogue's words; the one that mixes kinds of card
 * (Ultra Rare) as three rows, one per kind, so a full-art V can be in and a full-art ex out.
 */
export function RarityPicker({
    label,
    options,
    selected,
    onChange,
    isLoading,
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (r: string[]) => void;
    /** The rarities are still being read; the boxes are a spinner until they are in. */
    isLoading?: boolean;
}) {
    // A plain "Ultra Rare" saved before the split means all three of its rows.
    const shown = selected.flatMap((s) => (s.toLowerCase() === SPLIT_RARITY.toLowerCase() ? RARITY_SPLITS.map((k) => `${SPLIT_RARITY} / ${k.id}`) : [s]));
    return (
        <CheckPicker
            label={label}
            options={options.flatMap((r) =>
                r === SPLIT_RARITY ? RARITY_SPLITS.map((k) => ({ value: `${r} / ${k.id}`, label: `${r} · ${k.label}` })) : [{ value: r, label: r }],
            )}
            selected={shown}
            onChange={onChange}
            none="Every card, whatever its rarity."
            loading="Loading rarities…"
            isLoading={isLoading}
        />
    );
}
