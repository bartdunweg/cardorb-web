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
