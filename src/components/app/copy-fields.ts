import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";

/**
 * What a form may offer about one copy, given what the card actually is.
 *
 * Every finish this app can store is not every finish a card was printed in.
 * Offering all five on a card that only ever existed as a normal is offering
 * somebody an answer nobody can honestly pick, and the catalogue has known
 * which is which all along — it is the same reasoning the language picker
 * already runs on.
 *
 * Checked before it was trusted: twenty owned copies across four eras, every
 * printing recorded against them one TCGdex agrees exists. And the other way,
 * which matters more here — an export offers a reverse holo Espeon of Dark
 * Explorers that was never made, and its owner does not have one.
 *
 * Nothing is narrowed on a guess. The foil's pattern is not in any catalogue,
 * so that list stays whole; the only thing said about it is the one thing that
 * is certain, which is that a card with no foil at all has no pattern either.
 */

export type Options = { label: string; value: string }[];

const NOT_RECORDED = { label: "Not recorded", value: "" };

const FINISHES = [
    { label: "Normal", value: "normal", needs: "normal" },
    { label: "Reverse holo", value: "reverse-holo", needs: "reverse" },
    { label: "Holo", value: "holo", needs: "holo" },
    // Reverse holos with a pattern on them. TCGdex does not name them as a
    // printing of their own, so the honest test is the one they share: a card
    // with no reverse cannot have a patterned reverse. Which cards within 151
    // and Prismatic Evolutions got one is not something to guess at here.
    { label: "Poké Ball reverse", value: "poke-ball", needs: "reverse" },
    { label: "Master Ball reverse", value: "master-ball", needs: "reverse" },
] as const;

/**
 * The finishes to offer, plus whichever one is already recorded.
 *
 * That last part is the safety line. A catalogue that changes its mind, or a
 * copy somebody described before this existed, must not have its answer
 * silently dropped from the list it is sitting in — a select whose value is not
 * among its options shows blank, and saving the form would then clear it.
 */
export function finishOptions(facts: CardFacts | null | undefined, current: string | null | undefined): Options {
    const v = facts?.variants;
    const offered = FINISHES.filter((f) => !v || v[f.needs]);
    const kept = current && !offered.some((f) => f.value === current) ? FINISHES.filter((f) => f.value === current) : [];
    return [NOT_RECORDED, ...[...offered, ...kept].map((f) => ({ label: f.label, value: f.value }))];
}

/** Whether this card has a foil at all; a card without one has no pattern to record. */
export const hasFoil = (facts: CardFacts | null | undefined, current: string | null | undefined): boolean =>
    Boolean(current) || !facts?.variants || facts.variants.holo || facts.variants.reverse;
