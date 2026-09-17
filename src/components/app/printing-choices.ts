import { EDITION_LABELS, type Edition, FOIL_PATTERN_LABELS, type Finish, type FoilPattern } from "@/lib/card-shapes";

/**
 * The printings a card's sheet lets you look at, under its picture.
 *
 * Bart, 2026-09-15: under the card, a group of buttons between the printings that exist, and only
 * those. A printing TCGplayer sells apart has its own photo (cardorb-api#501), and choosing it shows
 * that photo; one without shows the card's scan with that printing's foil drawn over it. The print
 * runs (1st Edition, Shadowless) are the same kind of button, with the same picture rule (Bart, the
 * same day: "edities van dezelfde kaart moet je hetzelfde behandelen"). A card never has both: no
 * card sold in two runs is sold in two finishes, so a sheet shows one group or the other.
 *
 * Pure, so the rule can be read and tested apart from the sheet.
 */

/** One printing a card exists in, as the card route answers it. */
type Printing = { finish: Finish; foilPattern: string | null; image?: string | null };

export type PrintingChoice = {
    /** Unique within the card: the finish, and its pattern after a slash. */
    key: string;
    label: string;
    finish: Finish;
    foilPattern: FoilPattern | null;
    /** The printing's own picture, or null where the card's scan stands for it. */
    image: string | null;
};

export type EditionChoice = {
    key: Edition;
    label: string;
    /** The run's own picture, or null where the card's scan stands for it. */
    image: string | null;
};

/** Short words for the buttons: a group of four has to fit beside a 176 px card. */
const SHORT: Record<Finish, string> = {
    normal: "Normal",
    "reverse-holo": "Reverse",
    holo: "Holo",
    "poke-ball": "Poké Ball",
    "master-ball": "Master Ball",
    "energy-symbol": "Energy",
    "friend-ball": "Friend Ball",
    "love-ball": "Love Ball",
    "quick-ball": "Quick Ball",
    "dusk-ball": "Dusk Ball",
    "team-rocket": "Rocket",
};

const isPattern = (p: string | null | undefined): p is FoilPattern => !!p && p in FOIL_PATTERN_LABELS;

/**
 * The finishes to choose between, the card route's order kept, the pattern prints after them. Null
 * where there is nothing to choose: no answer yet, or a card printed one way only.
 */
export function printingChoices(
    facts:
        | {
              printings?: Printing[] | null;
              patternPrints?: { prints: { finish: Finish; foilPattern: FoilPattern; image?: string | null }[] } | null;
          }
        | null
        | undefined,
): PrintingChoice[] | null {
    const out = new Map<string, PrintingChoice>();
    const add = (p: Printing) => {
        const foilPattern = isPattern(p.foilPattern) ? p.foilPattern : null;
        const key = foilPattern ? `${p.finish}/${foilPattern}` : p.finish;
        const held = out.get(key);
        if (held) {
            // The same printing named twice: the one with a picture wins.
            if (!held.image && p.image) held.image = p.image;
            return;
        }
        const label = foilPattern ? `${FOIL_PATTERN_LABELS[foilPattern]} ${SHORT[p.finish].toLowerCase()}` : SHORT[p.finish];
        out.set(key, { key, label, finish: p.finish, foilPattern, image: p.image ?? null });
    };
    for (const p of facts?.printings ?? []) add(p);
    for (const p of facts?.patternPrints?.prints ?? []) add(p);
    return out.size > 1 ? [...out.values()] : null;
}

/** The print runs to choose between, or null where a card has one run or no answer. */
export function editionChoices(editions: Edition[] | null | undefined, pictures?: Record<string, string> | null): EditionChoice[] | null {
    return editions && editions.length > 1 ? editions.map((key) => ({ key, label: EDITION_LABELS[key], image: pictures?.[key] ?? null })) : null;
}

/**
 * The choice the sheet opens on: the copy's own printing where it is one of them, else the usual one.
 * A copy recorded with a pattern the card does not list opens on its plain finish.
 */
export function openingChoice<C extends { key: string }>(
    choices: C[] | null,
    own: string | null | undefined,
    /** Where there is no copy to open on: this one if the card has it, else the first. */
    usual?: string,
): string | null {
    if (!choices?.length) return null;
    return (
        choices.find((c) => c.key === own)?.key ??
        choices.find((c) => own?.startsWith(`${c.key}/`))?.key ??
        choices.find((c) => c.key === usual)?.key ??
        choices[0]!.key
    );
}

/**
 * The price series of a printing in a run, as the card's price history names them
 * (PRINTING_LABELS in price-change.ts), or null where the history has no such series.
 *
 * Bart, 2026-09-15: the price above follows the printing pressed below. TCGplayer files a run apart
 * only on the cards printed in more than one ("1st-edition-holofoil" beside "unlimited-holofoil");
 * everywhere else a finish is its own series ("reverse-holofoil", "poke-ball-reverse-holofoil"), and a foil
 * pattern print its own ("cosmos-holofoil").
 */
export function priceSeriesOf(finish: Finish, edition: Edition | null, series: ReadonlySet<string>, foilPattern: string | null = null): string | null {
    const foil = finish !== "normal";
    const pickFirst = (...keys: string[]) => keys.find((k) => series.has(k)) ?? null;
    // A cosmos or cracked ice print: its own product, stored as "cosmos-holofoil" since cardorb-api#512.
    if (foilPattern) return pickFirst(`${foilPattern}-${finish === "holo" ? "holofoil" : finish === "reverse-holo" ? "reverse-holofoil" : "normal"}`);
    if (edition === "1st-edition") return pickFirst(foil ? "1st-edition-holofoil" : "1st-edition");
    if (edition === "shadowless") return pickFirst(foil ? "shadowless-holofoil" : "shadowless");
    if (edition === "blue-border") return pickFirst("blue-border");
    if (finish === "reverse-holo") return pickFirst("reverse-holofoil");
    if (finish !== "normal" && finish !== "holo") return pickFirst(`${finish}-reverse-holofoil`);
    if (edition === "unlimited") return foil ? pickFirst("unlimited-holofoil", "holofoil") : pickFirst("unlimited", "normal");
    return foil ? pickFirst("holofoil") : pickFirst("normal");
}

/**
 * The price series and the price the sheet shows for the printing and run pressed under the card.
 *
 * `price` undefined is "the copy's own price" (nothing pressed away from the opening choice); null is
 * "that printing has none". A foil pattern print reads its own product's figure where the catalogue
 * sent one (it does not for a card you hold), and its line's latest day otherwise (cardorb-api#512:
 * Charmander's cosmos holo read "No price for this printing" over a line ending at €2.58).
 */
export function pressedPrinting({
    pressedAway,
    finish,
    edition,
    foilPattern,
    latest,
    patternPrice,
}: {
    pressedAway: boolean;
    finish: Finish;
    edition: Edition | null;
    foilPattern: string | null;
    /** The card's latest day of readings, per printing. */
    latest: Record<string, number> | undefined;
    patternPrice: number | null | undefined;
}): { series: string | null; price: number | null | undefined } {
    if (!pressedAway) return { series: null, price: undefined };
    const series = latest ? priceSeriesOf(finish, edition, new Set(Object.keys(latest)), foilPattern) : null;
    const fromLine = series ? (latest?.[series] ?? null) : null;
    return { series, price: foilPattern ? (patternPrice ?? fromLine) : fromLine };
}
