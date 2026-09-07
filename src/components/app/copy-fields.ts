import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { FOIL_PATTERN_LABELS, type FoilPattern } from "@/lib/api-shapes";

/**
 * What a form may offer about one copy, given what the card actually is.
 *
 * Every finish this app can store is not every finish a card was printed in, and every foil
 * pattern is certainly not. Offering all of them on a card that only ever existed as a holo is
 * offering answers nobody can honestly pick — the same reasoning the language picker has run on
 * for a while, applied to the rest of the form.
 *
 * The catalogue answers both, and it answers them together: a printing is a finish *and* its
 * foil. A Horsea of Shrouded Fable is a normal, a holo whose foil is cosmos, and a reverse — so
 * cosmos is not something that card has, it is something its holo has, and a pattern list that
 * ignored the chosen finish would still be offering something never made.
 *
 * Checked rather than assumed. Twenty owned copies across four eras: every printing recorded
 * against them is one TCGdex agrees exists. The other direction too — an export offers a reverse
 * holo Espeon of Dark Explorers that was never made, and its owner does not have one. And
 * TCGdex calls sv06.5-010 a holo with a cosmos foil, which is one of the three cards that
 * export records as a Cosmos Holo: two sources, one answer, arrived at separately.
 *
 * Two rules run through all of it. An empty list from the catalogue means *no answer*, not "none
 * exist", so everything is offered then — most cards carry no foil field yet, and hiding a
 * picker on that basis would stop somebody recording a card they are holding. And whatever is
 * already recorded stays offered whatever the catalogue says, because a select whose value is
 * not among its options shows blank and saving the form would quietly clear it.
 */

export type Options = { label: string; value: string }[];

const NOT_RECORDED = { label: "Not recorded", value: "" };

const FINISHES = [
    { label: "Normal", value: "normal", needs: "normal" },
    { label: "Reverse holo", value: "reverse-holo", needs: "reverse-holo" },
    { label: "Holo", value: "holo", needs: "holo" },
    // Reverse holos with a pattern on them. TCGdex does not name them as printings of their own,
    // so the honest test is the one they share: no reverse, no patterned reverse. Which cards
    // inside 151 and Prismatic Evolutions got one is not something to guess at here.
    { label: "Poké Ball reverse", value: "poke-ball", needs: "reverse-holo" },
    { label: "Master Ball reverse", value: "master-ball", needs: "reverse-holo" },
] as const;

/** The reverses, whatever their pattern, ask the catalogue about a plain reverse. */
const asPrinting = (finish: string): string => (finish === "poke-ball" || finish === "master-ball" ? "reverse-holo" : finish);

/** The finishes to offer, plus whichever one is already recorded. */
export function finishOptions(facts: CardFacts | null | undefined, current: string | null | undefined): Options {
    const made = facts?.printings ?? [];
    const offered = made.length ? FINISHES.filter((f) => made.some((p) => p.finish === f.needs)) : [...FINISHES];
    const kept = current && !offered.some((f) => f.value === current) ? FINISHES.filter((f) => f.value === current) : [];
    return [NOT_RECORDED, ...[...offered, ...kept].map((f) => ({ label: f.label, value: f.value }))];
}

/**
 * The foil patterns to offer for the finish somebody has chosen, plus whichever is recorded.
 *
 * Empty means there is nothing to ask, and the caller drops the row. That is the honest answer
 * for a plain normal: it has no foil, so it has no pattern.
 */
export function patternOptions(facts: CardFacts | null | undefined, finish: string | null | undefined, current: string | null | undefined): Options {
    const made = facts?.printings ?? [];
    const all = Object.keys(FOIL_PATTERN_LABELS) as FoilPattern[];

    // No answer from the catalogue: offer them all rather than none, but only where the copy
    // could have a foil in the first place.
    if (!made.length) {
        if (finish === "normal" && !current) return [];
        return [NOT_RECORDED, ...all.map((p) => ({ label: FOIL_PATTERN_LABELS[p], value: p }))];
    }

    const printing = finish ? asPrinting(finish) : null;
    const named = new Set(
        made
            .filter((p) => !printing || p.finish === printing)
            .map((p) => p.foilPattern)
            .filter((p): p is string => Boolean(p)),
    );
    if (current) named.add(current);
    if (!named.size) return [];

    return [NOT_RECORDED, ...all.filter((p) => named.has(p)).map((p) => ({ label: FOIL_PATTERN_LABELS[p], value: p }))];
}
