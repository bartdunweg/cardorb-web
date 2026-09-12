/**
 * What the catalogue writes in the rarity field where it has no rarity to give.
 *
 * Every card in a promo set answers "Promo": 1,084 of them across five sets, two exceptions. That
 * is the set's name, not the printing's rarity, and the set already says it. "None" and a blank are
 * the same answer in other words. No source publishes what such a card actually is: Mew ex SVP 053
 * (a special art) and Miraidon ex SVP 028 (a plain one) are identical in every field TCGdex and
 * TCGplayer publish, so the owner is the only one who can say.
 */
const UNNAMED = ["promo", "none"];

export const isUnnamedRarity = (rarity: string | null | undefined): boolean => {
    const r = rarity?.trim().toLowerCase() ?? "";
    return r === "" || UNNAMED.includes(r);
};

/**
 * What somebody can put on a card themselves, in the catalogue's own spelling, so a card named
 * here lands in the same filters, binder rules and Pokédex slots as a card the catalogue named.
 * The list is the kinds this app is for, not the whole vocabulary: the plain ones are at the end
 * for a promo that is simply a promo.
 */
/**
 * The chooser's own word for "nobody has said", which is not a rarity and is never stored: picked,
 * the card's rarity is cleared. A select needs a key for every row, and null is not one.
 */
export const NOT_KNOWN = "__not-known__";

export const RARITIES_BY_HAND: { value: string; label: string }[] = [
    { value: "Special illustration rare", label: "Special illustration rare" },
    { value: "Illustration rare", label: "Illustration rare" },
    { value: "Ultra Rare", label: "Ultra Rare (full art)" },
    { value: "Hyper rare", label: "Hyper rare" },
    { value: "Secret Rare", label: "Secret Rare" },
    { value: "Double rare", label: "Double rare" },
    { value: "Holo Rare", label: "Holo Rare" },
    { value: "Rare", label: "Rare" },
    { value: "Uncommon", label: "Uncommon" },
    { value: "Common", label: "Common" },
    /* Taking an answer back. It writes nothing rather than the catalogue's "Promo": that word names
       the set, and a set is not a rarity, so the field holding it said something untrue. Chosen, the
       card reads as unnamed once more and the choice returns, so a wrong answer is never permanent. */
    { value: NOT_KNOWN, label: "Not known" },
];

/**
 * What a card can be named, given the rarities its era printed.
 *
 * The list used to be the same ten on every card, so a black star promo from 1999 was offered
 * "Special illustration rare", a word the game did not have until 2023. The API answers what the
 * card's own era printed (`eraRarities`, measured from the sets of its TCGdex series), and this
 * is that answer in the order a person reads: the kinds this app knows first, in the order above,
 * then the era's own words it does not know, A to Z, then taking the answer back.
 *
 * No answer from the catalogue means the whole list, not none: the same rule the finish, pattern
 * and language pickers follow. A rarity already said is always kept, whatever the era claims,
 * because a control whose value is not among its options shows blank and would read as an answer
 * nobody gave.
 */
export function raritiesFor(era?: readonly string[] | null, said?: string | null): { value: string; label: string }[] {
    if (!era || era.length === 0) return RARITIES_BY_HAND;
    const printed = new Set(era.map((r) => r.trim().toLowerCase()));
    const kept = (said ?? "").trim().toLowerCase();
    const known = RARITIES_BY_HAND.filter((r) => r.value !== NOT_KNOWN && (printed.has(r.value.toLowerCase()) || r.value.toLowerCase() === kept));
    const spoken = new Set(known.map((r) => r.value.toLowerCase()));
    const rest = era
        // The chooser's own row for "nobody has said" is not a rarity, so a catalogue that ever
        // spelled one that way does not get to add a second one.
        .filter((r) => r.trim() && r.trim() !== NOT_KNOWN && !spoken.has(r.trim().toLowerCase()))
        .map((r) => ({ value: r.trim(), label: r.trim() }))
        .sort((a, b) => a.label.localeCompare(b.label));
    return [...known, ...rest, { value: NOT_KNOWN, label: "Not known" }];
}
