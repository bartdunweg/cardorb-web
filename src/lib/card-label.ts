import { EDITION_LABELS, type Edition, FOIL_PATTERN_LABELS, type Finish, type FoilPattern } from "@/lib/api-shapes";

type Labelled = { set_name?: string | null; set_abbr?: string | null; number?: string | null; printed_number?: string | null };

/**
 * The line under a card: which set it is from and which number it is, as the card prints it.
 *
 * One form everywhere (Bart, 2026-09-15: consistent, and the same as the number on the card). The
 * set's code and the printed number: "BS 4", "SVP 085", "CEC 216", "PR 13". A number that carries
 * its own code keeps that code instead of the set's ("XYP XY124" said the code twice), with the same
 * space as every other label: "XY 124", "SWSH 282", "SV 49" (Bart, 2026-09-15: "XY124" beside "BS 4"
 * read as two forms). A set with no code at all, official or Pokémon TCG Online's (Jumbo cards,
 * samples), reads its name before the number. No "#": it was never on a card.
 *
 * The printed number is the catalogue's (`printed_number`, cardorb-api's printedNumber); a row stores
 * the number stripped ("124" for XY124), so that is only the fallback. The code is the API's
 * `set_abbr`, which falls back to Pokémon TCG Online's code where there is no official one.
 */
export function cardLabel(card: Labelled): string {
    const code = card.set_abbr?.trim() || null;
    const number = (card.printed_number ?? card.number)?.trim() || null;
    if (!number) return code ?? card.set_name ?? "";
    if (/^[A-Za-z]/.test(number)) return number.replace(/^([A-Za-z]+)[\s-]*(?=\d)/, "$1 ");
    if (code) return `${code} ${number}`;
    return card.set_name ? `${card.set_name} ${number}` : number;
}

/**
 * The line under a card's name wherever cards are listed: its label, then its rarity after a bullet,
 * "PFL 004 · Double Rare" (Bart, 2026-09-15: on every list, not only a set's). A card with no rarity
 * keeps the label alone.
 */
export function cardLine(card: Labelled & { rarity?: string | null }): string {
    return [cardLabel(card), card.rarity?.trim()].filter(Boolean).join(" · ");
}

/**
 * The line under the title on a card's own sheet, where there is room for the set's name too:
 * the name and the card's printed label ("151 · MEW 199", "XY Black Star Promos · XY 124"). The name
 * alone was not enough for a set whose name reads like a code itself ("151").
 */
export function cardLabelFull(card: Labelled): string {
    const printed = cardLabel({ ...card, set_name: null });
    if (!card.set_name) return printed;
    if (!printed) return card.set_name;
    return `${card.set_name} · ${printed}`;
}

/** A finish in the words of the sheet's printing buttons, spelled out where those are cut short. */
const FINISH_WORDS: Record<Finish, string> = {
    normal: "Normal",
    "reverse-holo": "Reverse",
    holo: "Holo",
    "poke-ball": "Poké Ball",
    "master-ball": "Master Ball",
    "energy-symbol": "Energy Symbol",
    "friend-ball": "Friend Ball",
    "love-ball": "Love Ball",
    "quick-ball": "Quick Ball",
    "dusk-ball": "Dusk Ball",
    "team-rocket": "Team Rocket",
};

/**
 * Which printing a copy is, for the line under its name on a list: "Normal", "Holo", "Reverse",
 * "Poké Ball", "Cosmos holo", and a 1st Edition, Shadowless or Blue Border run before it
 * ("1st Edition · Holo"). The unlimited print is the ordinary one and stays unsaid. Null only where no
 * finish was chosen, as on a wish.
 *
 * Bart, 2026-09-15: a list of what you hold shows the run and the finish chosen on the sheet; a
 * Charizard held twice drew two tiles that looked the same. 2026-09-16: on every copy, the plain ones
 * too, since a tile without the line read as nothing rather than as "Normal".
 */
export function printingLine(copy: { finish?: string | null; foil_pattern?: string | null; edition?: string | null }): string | null {
    const finish = copy.finish && copy.finish in FINISH_WORDS ? (copy.finish as Finish) : null;
    if (!finish) return null;
    const pattern = copy.foil_pattern && copy.foil_pattern in FOIL_PATTERN_LABELS ? FOIL_PATTERN_LABELS[copy.foil_pattern as FoilPattern] : null;
    const printing = pattern ? `${pattern} ${FINISH_WORDS[finish].toLowerCase()}` : FINISH_WORDS[finish];
    const run = copy.edition && copy.edition !== "unlimited" && copy.edition in EDITION_LABELS ? EDITION_LABELS[copy.edition as Edition] : null;
    return run ? `${run} · ${printing}` : printing;
}

/**
 * The line under a copy's name on a list: which printing it is and what state it is in,
 * "Holo · Near Mint", "1st Edition · Holo · PSA 10".
 *
 * A copy is raw or it is graded and never both (see `graded.ts`), so it is the grade where there is
 * one and the condition otherwise, in the words they were recorded in. The grade is one string as a
 * collector writes it ("PSA 10"), which is how it is stored. Neither recorded leaves the printing
 * alone, and a wish, which has no printing either, has no line at all.
 *
 * Bart, 2026-09-16: the printing alone did not say whether the Holo you are looking at is a Near Mint
 * one or a slab.
 */
export function copyLine(copy: Parameters<typeof printingLine>[0] & { condition?: string | null; grade?: string | null }): string | null {
    const state = (copy.grade ?? copy.condition)?.trim() || null;
    return [printingLine(copy), state].filter(Boolean).join(" · ") || null;
}
