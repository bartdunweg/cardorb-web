"use client";

import { Checkbox } from "@/components/base/checkbox/checkbox";

// Which rarities fill a Pokédex: one box per rarity you hold a card of, in the catalogue's own
// words. None ticked is every card. A list of boxes rather than a select: several are meant to be
// on at once, and a person should see at a glance which.
export function RarityPicker({
    label,
    options,
    selected,
    onChange,
}: {
    label: string;
    /** The rarities on offer: the ones the collection holds, A to Z. */
    options: string[];
    selected: string[];
    onChange: (rarities: string[]) => void;
}) {
    const has = (r: string) => selected.some((s) => s.toLowerCase() === r.toLowerCase());
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium text-secondary">{label}</legend>
            <p className="text-sm text-tertiary">
                {selected.length ? `${selected.length} of ${options.length} rarities.` : "Every card, whatever its rarity."}
            </p>
            {options.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {options.map((r) => (
                        <Checkbox
                            key={r}
                            label={r}
                            isSelected={has(r)}
                            onChange={(on) =>
                                onChange(
                                    on
                                        ? [...selected.filter((s) => s.toLowerCase() !== r.toLowerCase()), r]
                                        : selected.filter((s) => s.toLowerCase() !== r.toLowerCase()),
                                )
                            }
                        />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-tertiary">Loading rarities…</p>
            )}
        </fieldset>
    );
}
