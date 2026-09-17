"use client";

import { useCallback, useEffect, useRef } from "react";
import type { StepFrom } from "@/components/app/step-motion";

type Params = { onPrev?: (() => void) | null; onNext?: (() => void) | null };

/**
 * The card sheet's way through the list it was opened from: the chevrons and the arrow keys, and
 * how the last step was taken, which the art reads to choose its motion.
 */
export function useSheetSteps({ onPrev, onNext }: Params) {
    /*
     * The arrow keys, which is how anybody who is already looking at a list expects to move
     * through it. Only when nothing is being typed into: the sheet holds a note field and a
     * grade box, and a left arrow inside those belongs to the cursor.
     */
    /*
     * Which way the list was stepped and how, kept for the art below (`stepMotion`): after a chevron
     * the next card slides in from the side its arrow sits on and the last one leaves through the
     * other; after an arrow key it fades in place, and a held key's repeats draw it at once. Zero
     * when the sheet opened on this card, so there is nothing to slide from.
     */
    const stepFrom = useRef<StepFrom>({ dir: 0, key: false, repeat: false });
    const step = useCallback(
        (dir: -1 | 1, key?: { repeat: boolean }) => {
            const go = dir < 0 ? onPrev : onNext;
            if (!go) return;
            stepFrom.current = { dir, key: !!key, repeat: key?.repeat ?? false };
            go();
        },
        [onPrev, onNext],
    );
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const el = e.target as HTMLElement | null;
            /* Not only the fields: react-aria's tab list moves between tabs with the arrow keys,
               and the price chart's arrows are the only way to reach its individual figures, the
               whole of its text alternative. Both sat under this handler, so on the Price tab a
               right arrow threw you onto another card instead of reading the next price. */
            if (
                el?.closest(
                    // The kit's Select is a button with a listbox behind it, and react-aria moves its
                    // selection with these keys: one ArrowRight on a copy's Language saved the next
                    // language to every row of that kind and stepped to the next card in one press.
                    "input, textarea, select, [aria-haspopup='listbox'], [contenteditable='true'], [role='tab'], [role='tablist'], [role='menu'], [role='menuitem'], [role='listbox'], [role='option'], [role='slider'], [tabindex]:not([tabindex='-1']) svg, figure",
                )
            )
                return;
            // A second dialog over the sheet (Add a copy, Mark as owned, the palette) owns the keys:
            // stepping the card under an open form wrote the form's values to the next card's id.
            if (document.querySelectorAll("[role='dialog']").length > 1) return;
            if (e.key === "ArrowLeft") step(-1, { repeat: e.repeat });
            if (e.key === "ArrowRight") step(1, { repeat: e.repeat });
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [step]);

    return { stepFromRef: stepFrom, step };
}
