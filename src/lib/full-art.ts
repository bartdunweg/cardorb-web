/**
 * Which cards are full art.
 *
 * A full art card is one where the illustration covers the whole card instead of sitting in a
 * frame (Bulbapedia, "Full Art card (TCG)"). That is a look, not a rarity, and no catalogue
 * records it: TCGdex answers a rarity and nothing else. So the rule is read off the rarity and
 * the set's own numbering, which is enough because the two together say the same thing in every
 * era.
 *
 * Bulbapedia's rarity page is what the two lists below follow. "Some Full Art Pokémon, except
 * Pokémon ex, are of this rarity" (illustration rare), "Some Full Art Pokémon ex and Supporter
 * cards are of this rarity" (special illustration rare), and of a rainbow rare: "the same art as
 * their Full Art variants, but all have a rainbow holographic colour". A gold card is not one:
 * what it gets is "golden borders".
 *
 * ## Why the rarity alone will not do it
 *
 * "Ultra Rare" means a different card in every era, counted in the catalogue on 2026-09-12:
 *
 * - Scarlet & Violet (151): Ultra Rare is the full art ex, 182 to 197. Full art.
 * - Sword & Shield (base): Ultra Rare is the full art V, 187 to 202. Full art.
 * - Sun & Moon (base): Ultra Rare is the *plain* GX, 12 to 149. Not full art at all; the full
 *   arts of that set are its Secret Rares, 150 upward.
 * - XY (base): Ultra Rare is the plain EX and the full art EX at once, in one rarity.
 *
 * A fixed list of rarities would hand back every plain GX in Sun & Moon and miss its full arts.
 *
 * ## The rule
 *
 * In every era a full art is a *reprint*: it carries a card's name a second time, later in the
 * set, with the art let out to the edges. So a card of an ambiguous rarity is full art when the
 * same name already stood earlier in the set. The plain GX at 12 is the first Decidueye GX and is
 * out; the Secret Rare at 150 is the second and is in. The rarities that are only ever full art
 * (illustration rare and the rest) need no such test.
 *
 * ## What it gets wrong
 *
 * A set the catalogue has not named the categories of keeps the gold item cards of Sun & Moon
 * and Sword & Shield (a gold Quick Ball, a gold Nest Ball): they are reprints of a Secret Rare
 * too, four to a set. Where `trainerType` is there they are left out, because at these rarities
 * a Supporter is the full art reprint and an Item, a Tool or a Stadium is the gold one.
 */

/** A card as this rule reads it: the fields every list already holds. */
export type FullArtCard = {
    name: string;
    number: string;
    rarity: string | null;
    /** "Pokemon", "Trainer" or "Energy", where the catalogue said. */
    category?: string | null;
    /** "Supporter", "Item", "Tool" or "Stadium"; null for anything that is not a trainer. */
    trainerType?: string | null;
};

/** Rarities that are full art wherever they appear, so the numbering never has to be asked. */
const ALWAYS_FULL_ART = new Set([
    "illustration rare",
    "special illustration rare",
    "shiny ultra rare",
    "shiny rare",
    "full art trainer",
    "black white rare",
    "crown",
    "amazing rare",
]);

/**
 * Rarities that hold both a plain card and its full art reprint, and so are decided by the
 * numbering. "Hyper rare" is deliberately not here: that is the gold card, which has borders.
 */
const REPRINT_RARITIES = new Set(["ultra rare", "secret rare"]);

const rarityOf = (card: FullArtCard) => (card.rarity ?? "").trim().toLowerCase();

/** A card's number as one number, so "045" and "45" sort alike and a letter does not throw. */
const numberOf = (card: FullArtCard) => {
    const digits = card.number.replace(/\D/g, "");
    return digits ? Number(digits) : Number.POSITIVE_INFINITY;
};

/**
 * Which cards of a set are full art. Takes the whole set, because the rule is about a card's
 * place in it: the same rarity means the opposite thing at the two ends of a set.
 */
export function fullArtIds(cards: FullArtCard[]): Set<string> {
    // The first number each name was printed at. A later printing of the same name is the reprint.
    const first = new Map<string, number>();
    for (const card of cards) {
        const key = card.name.trim().toLowerCase();
        const at = numberOf(card);
        const seen = first.get(key);
        if (seen === undefined || at < seen) first.set(key, at);
    }
    const ids = new Set<string>();
    for (const card of cards) {
        const rarity = rarityOf(card);
        if (ALWAYS_FULL_ART.has(rarity)) {
            ids.add(card.number);
            continue;
        }
        if (!REPRINT_RARITIES.has(rarity)) continue;
        // An item, a tool or a stadium at these rarities is the gold card, not a full art: what
        // the two share is a rarity and nothing else. Only read where the catalogue said; without
        // it the gold ones come along, which the file's head admits.
        const category = (card.category ?? "").trim().toLowerCase();
        if (category === "energy") continue;
        const trainerType = (card.trainerType ?? "").trim().toLowerCase();
        if (category === "trainer" && trainerType && trainerType !== "supporter") continue;
        if ((first.get(card.name.trim().toLowerCase()) ?? Number.POSITIVE_INFINITY) < numberOf(card)) ids.add(card.number);
    }
    return ids;
}

/** The value the rarity menu carries for full art. Not a rarity, so it cannot collide with one. */
export const FULL_ART = "__full-art";
