import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { EDITIONS, EDITION_LABELS, FINISH_LABELS, FINISHES as FINISH_ORDER, FOIL_PATTERN_LABELS, type FoilPattern } from "@/lib/api-shapes";

/**
 * What a form may offer about one copy, given what the card actually is.
 *
 * Every finish this app can store is not every finish a card was printed in, and every foil
 * pattern is certainly not. Offering all of them on a card that only ever existed as a holo is
 * offering answers nobody can honestly pick, the same reasoning the language picker has run on
 * for a while, applied to the rest of the form.
 *
 * The catalogue answers both, and it answers them together: a printing is a finish *and* its
 * foil. A Horsea of Shrouded Fable is a normal, a holo whose foil is cosmos, and a reverse, so
 * cosmos is not something that card has, it is something its holo has, and a pattern list that
 * ignored the chosen finish would still be offering something never made.
 *
 * Checked rather than assumed. Twenty owned copies across four eras: every printing recorded
 * against them is one TCGdex agrees exists. The other direction too: an export offers a reverse
 * holo Espeon of Dark Explorers that was never made, and its owner does not have one. And
 * TCGdex calls sv06.5-010 a holo with a cosmos foil, which is one of the three cards that
 * export records as a Cosmos Holo: two sources, one answer, arrived at separately.
 *
 * Two rules run through all of it. An empty list from the catalogue means *no answer*, not "none
 * exist", so everything is offered then; most cards carry no foil field yet, and hiding a
 * picker on that basis would stop somebody recording a card they are holding. And whatever is
 * already recorded stays offered whatever the catalogue says, because a select whose value is
 * not among its options shows blank and saving the form would quietly clear it.
 */

export type Options = { label: string; value: string }[];

/**
 * The one answer, where a list has only one.
 *
 * A select holding "Not recorded" and a single real value is not a choice, and asking it is
 * worse than not asking: on a card that only ever existed as a holo, "not recorded" and "holo"
 * are the same card, so the question invites somebody to leave out something we know. The form
 * states it instead, and saves it, which is not a guess, it is the only possibility.
 */
export const soleOption = (options: Options): { label: string; value: string } | null => {
    // A blank that is itself an answer ("Standard") makes two real choices, not one.
    if (options.some((o) => o.value === "" && o !== NOT_RECORDED)) return null;
    const real = options.filter((o) => o.value !== "");
    return options.length === real.length + 1 && real.length === 1 ? real[0]! : null;
};

const NOT_RECORDED = { label: "Not recorded", value: "" };
const STANDARD = { label: "Standard", value: "" };

/*
 * Every finish asks the catalogue about itself, the ball reverses included. They used to ask
 * about a plain reverse instead, on the grounds that TCGdex did not name them and which cards of
 * 151 and Prismatic Evolutions got one was not something to guess at. It does name them
 * (`foil: "pokeball"`), the API reads them as finishes of their own since cardorb-api#342, and a
 * card with an ordinary reverse stops offering two prints it never had.
 */
const FINISHES = FINISH_ORDER.map((value) => ({ value, label: FINISH_LABELS[value] }));

/** The reverses ask the catalogue about a plain reverse when asking after a foil pattern. */
const asPrinting = (finish: string): string => (finish === "poke-ball" || finish === "master-ball" ? "reverse-holo" : finish);

/** The finishes to offer, plus whichever one is already recorded. */
export function finishOptions(facts: CardFacts | null | undefined, current: string | null | undefined): Options {
    const made = facts?.printings ?? [];
    const offered = made.length ? FINISHES.filter((f) => made.some((p) => p.finish === f.value)) : [...FINISHES];
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
    /* The patterns the card's era could have at all. An empty list is the API saying none: a
       Wizards holo had its set's one foil (Starlight, then Cosmos), and asking which of five a
       Base Set Machamp has offers five wrong answers. Null leaves it to the printings below. */
    const era = facts?.foilPatterns ?? null;
    const all = (Object.keys(FOIL_PATTERN_LABELS) as FoilPattern[]).filter((p) => !era || era.includes(p) || p === current);
    if (!all.length) return [];

    /* No answer from the catalogue: offer them all rather than none, but only where the copy
       could have a foil in the first place. A card whose printings are listed and whose foils
       are not named anywhere counts as no answer too. TCGdex names the foil on a fraction of the
       cards it knows the printings of, and reading that silence as "this card has no pattern"
       would take the question away from somebody holding a cracked ice reverse and looking at
       it. Where it does name a foil on this card, its silence about another printing is an
       answer, and that is the rule below. */
    if (!made.length || !made.some((p) => p.foilPattern)) {
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

    /* A finish printed both with a named foil and without one is a choice between the two, not
       one answer: 151's Machamp is a plain holo from the booster and a cosmos holo from the
       collection box, and stating "Cosmos" on every holo copy of it was wrong. The blank is then
       "Standard", which is what a copy with no pattern recorded is. */
    const plain = made.some((p) => !p.foilPattern && (!printing || p.finish === printing));
    return [plain ? STANDARD : NOT_RECORDED, ...all.filter((p) => named.has(p)).map((p) => ({ label: FOIL_PATTERN_LABELS[p], value: p }))];
}

/**
 * Which print runs to offer, plus whichever is already recorded.
 *
 * The same two rules as the finishes above, applied to the runs the API says this card can be
 * from (`editions`, cardorb-api#342 and #375): TCGdex and TCGplayer know whether a stamped run
 * exists, TCGplayer whether an unstamped one does, and it sells Shadowless as a product of its own
 * for Base Set. So a
 * Jungle card offers 1st Edition and unlimited, where all three used to be offered on the
 * grounds that nothing published which sets had a Shadowless run. Something does.
 *
 * Unlimited on its own is not a question: every card was printed, so "unlimited" and "not
 * recorded" say the same thing there and the caller drops the row, which is what a card printed
 * once has always done.
 *
 * No answer at all means all three, for the reason the finish list does it: no answer is not
 * "none exist". `firstEdition` is still read for an API older than the one that answers
 * `editions`.
 */
export function editionOptions(facts: CardFacts | null | undefined, current: string | null | undefined, language?: string | null): Options {
    const runs = facts?.editions ?? null;
    const all = EDITIONS.filter((e) => inLanguage(e, language) || e === current);
    if (!runs) {
        if (facts?.firstEdition === false && !current) return [];
        return [NOT_RECORDED, ...all.map((e) => ({ label: EDITION_LABELS[e], value: e }))];
    }
    const offered = all.filter((e) => runs.includes(e) || e === current);
    /* Unlimited alone is no question, as above. A stamped run alone is one, answered: Base Set
       Machamp was printed stamped and never without, so the caller states 1st Edition rather
       than asking whether it is (soleOption). */
    if (!current && (offered.length === 0 || (offered.length === 1 && offered[0] === "unlimited"))) return [];
    return [NOT_RECORDED, ...offered.map((e) => ({ label: EDITION_LABELS[e], value: e }))];
}

/**
 * Whether a run exists in the language a copy is in.
 *
 * Shadowless is the English release and only that one. Bulbapedia, on Base Set: "Unlike the
 * English release, 1st Edition prints in other languages were not produced using the Shadowless
 * layout. Instead, they feature the same card design as their respective Unlimited prints." So a
 * German Base Set card has a 1st Edition and an unlimited run and no middle one, and was being
 * offered a layout that was never printed in German.
 *
 * Not recorded reads as English, which is what the rest of the app does with a language nobody
 * set (languageOf), and which nearly every copy is.
 */
const inLanguage = (edition: string, language: string | null | undefined): boolean => edition !== "shadowless" || !language || language === "en";
