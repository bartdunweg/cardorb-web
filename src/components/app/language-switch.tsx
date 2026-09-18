"use client";

import type { PaletteLanguage } from "@/components/app/command-search";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";

const CHOICES: { id: PaletteLanguage; label: string }[] = [
    { id: "en", label: "English" },
    { id: "ja", label: "Japanese" },
    { id: "both", label: "Both" },
];

/**
 * Ours, from the kit's ButtonGroup: which catalogue the palette searches, English, Japanese or both.
 * Two catalogues and their sum are three choices, too few to hide behind a menu, so each is one tap
 * (Bart's call, 2026-09-18). It replaced a filter chip that opened a menu of one entry. Drawn at the
 * chips' height and rounded like them, so it reads as the first of the row that follows it.
 */
export function LanguageSwitch({ value, onChange }: { value: PaletteLanguage; onChange: (next: PaletteLanguage) => void }) {
    return (
        <ButtonGroup
            size="sm"
            aria-label="Language"
            className="shrink-0 rounded-full"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={new Set([value])}
            onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next === "en" || next === "ja" || next === "both") onChange(next);
            }}
        >
            {CHOICES.map((choice) => (
                <ButtonGroupItem key={choice.id} id={choice.id} className="px-3 py-1.5 text-xs not-last:pr-3 first:rounded-l-full last:rounded-r-full">
                    {choice.label}
                </ButtonGroupItem>
            ))}
        </ButtonGroup>
    );
}
