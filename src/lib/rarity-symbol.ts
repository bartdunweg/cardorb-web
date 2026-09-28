/**
 * The rarity mark a card prints in its corner, worked out from the catalogue's rarity name and the
 * set it is from.
 *
 * What is drawn is what the card itself carries (Bart, 2026-09-28), which is not the same for one
 * name across the years:
 * - An English card from Scarlet & Violet on (2023: `sv…`, `me…`, `30th`) prints today's marks,
 *   one per rarity: two silver stars for an Ultra Rare, three gold ones for a Hyper Rare.
 * - An English card before that prints a dot, a diamond or a star and nothing else: a Sun & Moon
 *   GX that TCGdex calls an Ultra Rare has one black star, and gets one here.
 * - A Japanese card from Black & White on prints a code in letters (RR, SAR, UR); one before
 *   that prints the dot, diamond and star as well.
 *
 * Secret rare is no mark at all: it is a number above the set's total (140/132). The old sets that
 * TCGdex names "Secret Rare" print a star, and get one. A rarity whose mark nobody has confirmed
 * (Classic Collection, Prism Rare) gets none rather than a guess: the name stays beside it either way.
 */

export type RarityMark =
    | { kind: "common" }
    | { kind: "uncommon" }
    | { kind: "rare" }
    | { kind: "double" }
    | { kind: "ace-spec" }
    | { kind: "ultra" }
    | { kind: "illustration" }
    | { kind: "special-illustration" }
    | { kind: "hyper" }
    | { kind: "mega-attack" }
    | { kind: "mega-hyper" }
    | { kind: "shiny" }
    | { kind: "shiny-ultra" }
    | { kind: "black-white" }
    | { kind: "futuristic" }
    | { kind: "rgb" }
    | { kind: "pikachu" }
    | { kind: "promo" }
    /** A Japanese card's printed letters. */
    | { kind: "code"; code: string };

type Kind = Exclude<RarityMark["kind"], "code">;

const key = (rarity: string) => rarity.trim().toLowerCase();

/** Today's English marks, one per rarity, as Scarlet & Violet and Mega Evolution print them. */
const MODERN: Record<string, Kind> = {
    common: "common",
    uncommon: "uncommon",
    rare: "rare",
    "double rare": "double",
    "ace spec rare": "ace-spec",
    "ultra rare": "ultra",
    "illustration rare": "illustration",
    "special illustration rare": "special-illustration",
    "hyper rare": "hyper",
    "mega attack rare": "mega-attack",
    "mega hyper rare": "mega-hyper",
    "shiny rare": "shiny",
    "shiny ultra rare": "shiny-ultra",
    "black white rare": "black-white",
    "futuristic rare": "futuristic",
    "rgb rare": "rgb",
    "pikachu rare": "pikachu",
    promo: "promo",
};

/** The letters a Japanese card prints, from Black & White on. */
const JAPANESE: Record<string, string> = {
    common: "C",
    uncommon: "U",
    rare: "R",
    "double rare": "RR",
    "triple rare": "RRR",
    "super rare": "SR",
    "hyper rare": "HR",
    "ultra rare": "UR",
    "art rare": "AR",
    "special art rare": "SAR",
    "shiny rare": "S",
    "shiny super rare": "SSR",
    "character rare": "CHR",
    "character super rare": "CSR",
    "trainer rare": "TR",
    "amazing rare": "A",
    "radiant rare": "K",
    "ace spec rare": "ACE",
    "black white rare": "BWR",
    "mega attack rare": "MA",
    "mega ultra rare": "MUR",
    "futuristic rare": "FUR",
};

/** A Japanese card's marks that are a picture rather than letters. */
const JAPANESE_PICTURES: Record<string, Kind> = { "pikachu rare": "pikachu", "rgb rare": "rgb", promo: "promo" };

/** The two old names without "rare" in them that print a star all the same. */
const ONLY_A_STAR = new Set(["legend", "galarian gallery"]);

/** The set id out of a catalogue card id: "sv10.5w-013" is set "sv10.5w", "M-P-001" is "M-P". */
export const setIdOf = (cardId: string | null | undefined): string | null => {
    const id = cardId?.trim();
    if (!id) return null;
    const cut = id.lastIndexOf("-");
    return cut > 0 ? id.slice(0, cut) : id;
};

/** A Japanese catalogue id: TCGdex writes those in capitals ("SV4a", "M1L"), and English ones in lower case. */
const japaneseSet = (setId: string) => /^[A-Z]/.test(setId);

/** An English set from Scarlet & Violet on, including its promos and the 30th Celebration. */
const modernEnglish = (setId: string) => /^(sv|me|mf|30th|202[3-9]sv)/i.test(setId);

/** A Japanese set from Black & White on, when the letters replaced the dot, diamond and star. */
const lettersJapanese = (setId: string) => /^(BW|XY|CP|S|M)/.test(setId);

/**
 * The mark one card prints. `setId` is the catalogue's set id (from `setIdOf` on a card id); without
 * it the era is unknown and the name's own mark stands (`rarityMarkOfName`), which leaves out the
 * names that print two. `language` "ja" says the card is off the Japanese shelf where the id alone cannot.
 */
export function rarityMark(rarity: string | null | undefined, set?: { setId?: string | null; language?: string | null }): RarityMark | null {
    if (!rarity?.trim()) return null;
    const r = key(rarity);
    const setId = set?.setId?.trim() || null;
    if (setId === null && set?.language !== "ja") return rarityMarkOfName(rarity);
    const japanese = set?.language === "ja" || (setId !== null && japaneseSet(setId));

    if (japanese) {
        if (JAPANESE_PICTURES[r]) return { kind: JAPANESE_PICTURES[r] };
        if (setId === null || lettersJapanese(setId)) return JAPANESE[r] ? { kind: "code", code: JAPANESE[r] } : null;
        return classic(r);
    }
    if (setId !== null && modernEnglish(setId)) return MODERN[r] ? { kind: MODERN[r] } : null;
    return classic(r);
}

/** The three marks every card printed before today's, and the promo star. */
function classic(r: string): RarityMark | null {
    if (r === "common") return { kind: "common" };
    if (r === "uncommon") return { kind: "uncommon" };
    if (r === "promo") return { kind: "promo" };
    if (r === "classic collection" || r === "prism rare") return null;
    return r.includes("rare") || ONLY_A_STAR.has(r) ? { kind: "rare" } : null;
}

/** Names whose English mark changed with Scarlet & Violet: one filter row holds cards of both. */
const TWO_MARKS = new Set(["ultra rare", "shiny rare"]);

/**
 * The mark beside a rarity's name where no one card is meant: a filter row, a Pokédex's boxes. One
 * row holds cards of every era, so it shows the name's mark as an English card prints it today; a
 * name only Japanese cards carry (Super Rare, Art Rare) shows its letters, and a name that prints
 * two different marks by era (Ultra Rare, Shiny Rare) shows none rather than one that half the row
 * does not carry.
 */
export function rarityMarkOfName(rarity: string | null | undefined): RarityMark | null {
    if (!rarity?.trim()) return null;
    const r = key(rarity);
    if (TWO_MARKS.has(r)) return null;
    if (MODERN[r]) return { kind: MODERN[r] };
    if (JAPANESE[r]) return { kind: "code", code: JAPANESE[r] };
    return classic(r);
}
