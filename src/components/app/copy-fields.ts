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
 * Two rules run through all of it. For the finishes, an empty list from the catalogue means *no
 * answer*, not "none exist", so everything is offered then. The foil pattern is the exception
 * since 2026-09-14: TCGplayer sells every pattern print as a product of its own
 * (`patternPrints`, cardorb-api#452), so a card with none listed has none, and the form asks
 * nothing. And whatever is already recorded stays offered whatever the catalogue says, because a
 * select whose value is not among its options shows blank and saving the form would quietly
 * clear it.
 */

export type Options = { label: string; value: string }[];

/**
 * The one answer, where a list has only one.
 *
 * A select holding a single real value, with or without "Not recorded" beside it, is not a choice, and asking it is
 * worse than not asking: on a card that only ever existed as a holo, "not recorded" and "holo"
 * are the same card, so the question invites somebody to leave out something we know. The form
 * states it instead, and saves it, which is not a guess, it is the only possibility.
 */
export const soleOption = (options: Options): { label: string; value: string } | null => {
    // A blank that is itself an answer ("Standard") makes two real choices, not one.
    if (options.some((o) => o.value === "" && o !== NOT_RECORDED)) return null;
    const real = options.filter((o) => o.value !== "");
    return real.length === 1 && options.length - real.length <= 1 ? real[0]! : null;
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

/**
 * The finishes to offer, plus whichever one is already recorded.
 *
 * No "Not recorded": a copy you own has a finish since 2026-09-13 (cardorb-api#382). An empty
 * finish bought no price, and two copies differing only in the finish nobody wrote down were one
 * copy to the store, which is how a normal and a reverse holo of seven cards became one of two.
 */
export function finishOptions(facts: CardFacts | null | undefined, current: string | null | undefined): Options {
    /* A pattern print is a printing too: a common Rowlet of Sun & Moon is a normal and a reverse in
       its set and a cosmos holo from a blister, and recording that copy needs the holo. */
    const sold = facts?.patternPrints?.prints ?? [];
    const made = [...(facts?.printings ?? []), ...(facts?.printings?.length ? sold : [])];
    const offered = made.length ? FINISHES.filter((f) => made.some((p) => p.finish === f.value)) : [...FINISHES];
    const kept = current && !offered.some((f) => f.value === current) ? FINISHES.filter((f) => f.value === current) : [];
    return [...offered, ...kept].map((f) => ({ label: f.label, value: f.value }));
}

/**
 * The finish a form starts on when the copy has none: the only one offered, normal where it is
 * offered, the first otherwise. The API's defaultFinish() reads the catalogue the same way.
 */
export const defaultFinishOf = (options: Options): string =>
    soleOption(options)?.value ?? options.find((o) => o.value === "normal")?.value ?? options[0]?.value ?? "normal";

/**
 * The foil patterns to offer for the finish somebody has chosen, plus whichever is recorded.
 *
 * Bart, 2026-09-14: "bij alles wat holo is kan ik foil pattern kiezen, maar dat is niet de
 * bedoeling, dat moet voor je worden geselecteerd". Only patterns that exist for this card in this
 * finish: the ones TCGplayer sells a print of (`patternPrints`) and the ones TCGdex names on a
 * printing. None of either and nothing recorded is an empty list, and the caller drops the row:
 * the copy is Standard, and nobody is asked.
 *
 * Where a pattern exists, Standard sits beside it when a print of this finish without a pattern
 * exists too, and starts selected (the blank value, which is what a copy with no pattern is):
 * 151's Machamp is a plain holo from the booster and a cosmos holo from the collection box. Where
 * none does, the list is the pattern alone and soleOption states it: a common Rowlet of Sun & Moon
 * was never a plain holo, so a holo copy of it is the cosmos one.
 */
export function patternOptions(facts: CardFacts | null | undefined, finish: string | null | undefined, current: string | null | undefined): Options {
    const made = facts?.printings ?? [];
    const sold = facts?.patternPrints ?? null;
    const printing = finish ? asPrinting(finish) : null;
    const ofFinish = (p: { finish: string }) => !printing || p.finish === printing;

    const named = new Set<string>([
        ...made.filter(ofFinish).flatMap((p) => (p.foilPattern ? [p.foilPattern] : [])),
        ...(sold?.prints ?? []).filter(ofFinish).map((p) => p.foilPattern),
    ]);
    if (current) named.add(current);
    if (!named.size) return [];

    /* A print of this finish with no pattern. TCGdex's printings say so where they are listed;
       where they are not, TCGplayer's `standard` is the answer, and it is false only for a card
       that was never sold without its pattern. */
    const plain = sold?.standard !== false && (made.length ? made.some((p) => !p.foilPattern && ofFinish(p)) : true);
    const order = Object.keys(FOIL_PATTERN_LABELS) as FoilPattern[];
    const known = order.filter((p) => named.has(p)).map((p) => ({ label: FOIL_PATTERN_LABELS[p], value: p }));
    return [plain ? STANDARD : NOT_RECORDED, ...known];
}

/**
 * The pattern a form saves: the one chosen while it is still offered, the only one where the list
 * has one, and Standard otherwise. A pattern picked for a holo does not ride along when the
 * finish changes to one that never had it.
 */
export const effectivePatternOf = (options: Options, chosen: string): string =>
    (chosen && options.some((o) => o.value === chosen) ? chosen : soleOption(options)?.value) ?? "";

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
