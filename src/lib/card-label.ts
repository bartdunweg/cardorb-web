import type { CardsSize } from "@/lib/cards-view";

/**
 * The line under a card: which set it is from and which number it is.
 *
 * Two versions of one fact, because the space they get is not the same. In a grid four across
 * on a phone, "Ascended Heroes · #276" is a sentence that truncates to "Ascended He…" and tells
 * you nothing; "DRI 230" is what is printed in the corner of the card you are holding, and a
 * collector reads it at a glance. On a large tile, or on the card's own page, there is room for
 * the name and the name is friendlier.
 *
 * The code is the catalogue's own — `abbreviation.official` on a TCGdex set, which the API has
 * always read for its Limitless links. It is missing for exactly one of the 69 sets in a real
 * collection, so the fallback is the full name rather than a blank.
 */
export function cardLabel(card: { set_name?: string | null; set_abbr?: string | null; number?: string | null }, size: CardsSize): string {
    const number = card.number?.trim() || null;

    // `lg` is two to four tiles across; `sm` and `md` are four to eight, where a set name is a
    // line of text nobody finishes reading.
    if (size !== "lg" && card.set_abbr) return [card.set_abbr, number].filter(Boolean).join(" ");

    return [card.set_name, number ? `#${number}` : null].filter(Boolean).join(" · ");
}
