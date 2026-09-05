"use client";

import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { type DexRange, GENERATIONS, NATIONAL_DEX_MAX } from "@/lib/folder-rule";

export type DexDraft = { from: string; to: string };

export const dexDraft = (range: DexRange | undefined): DexDraft => ({ from: range ? String(range.from) : "", to: range ? String(range.to) : "" });

/** The draft as a range: nothing typed is no range; one end typed fills the other with the dex's. */
export const dexFromDraft = (d: DexDraft): DexRange | undefined =>
    d.from || d.to ? { from: d.from ? Number(d.from) : 1, to: d.to ? Number(d.to) : NATIONAL_DEX_MAX } : undefined;

// A Pokédex range: the nine generations as presets, or two numbers. Shared by a rule and by the
// Pokédex setting, which both ask "which Pokémon".
export function DexRangeFields({ label, anyLabel, dex, onChange }: { label: string; anyLabel: string; dex: DexDraft; onChange: (dex: DexDraft) => void }) {
    const generation = GENERATIONS.find((g) => String(g.from) === dex.from && String(g.to) === dex.to);
    const value = !dex.from && !dex.to ? "" : (generation?.label ?? "custom");
    return (
        <div className="flex flex-col gap-1.5">
            <NativeSelect
                label={label}
                value={value}
                onChange={(event) => {
                    const v = event.target.value;
                    const gen = GENERATIONS.find((g) => g.label === v);
                    if (gen) onChange({ from: String(gen.from), to: String(gen.to) });
                    else if (v === "") onChange({ from: "", to: "" });
                }}
                options={[
                    { label: anyLabel, value: "" },
                    ...GENERATIONS.map((g) => ({ label: `${g.label} (${g.from}–${g.to})`, value: g.label })),
                    { label: "Custom range", value: "custom" },
                ]}
            />
            <div className="flex gap-2">
                <Input aria-label="From dex number" type="number" placeholder="From" value={dex.from} onChange={(v) => onChange({ ...dex, from: v })} />
                <Input aria-label="To dex number" type="number" placeholder="To" value={dex.to} onChange={(v) => onChange({ ...dex, to: v })} />
            </div>
        </div>
    );
}
