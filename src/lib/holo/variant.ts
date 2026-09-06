/**
 * Which holographic treatment a card gets in its sheet.
 *
 * The vendored effect (src/styles/vendor/pokemon-cards-css) selects its look by the rarity names
 * of the old Pokémon TCG API on `data-rarity`, with `data-subtypes`, `data-supertype` and
 * `data-trainer-gallery` refining it. Cardorb's cards carry TCGdex's rarity names, so every one of
 * those is sent to the closest family here, and the copy's finish has the last word: a reverse
 * holo Common shines around its picture, a holo Rare shines like a Rare Holo.
 *
 * Without the source's per-card masks every family covers the whole card; the table only says
 * which family.
 */

export type HoloVariant = {
    /** The vendored CSS's `data-rarity` value. */
    rarity: string;
    /** `data-subtypes`: the stage, which decides the clip of the art window. */
    subtypes: string;
    /** `data-supertype`: "pokémon" or "trainer", with the accent the CSS matches. */
    supertype: "pokémon" | "trainer";
    /** Trainer Gallery printings (TG/GG numbers) get their own foils. */
    trainerGallery: boolean;
    /** The card's types as the CSS's class names; only the ones it knows. */
    typeClasses: string[];
};

const FAMILY: Record<string, string> = {
    none: "common",
    common: "common",
    promo: "common",
    "classic collection": "common",
    "one diamond": "common",
    uncommon: "uncommon",
    "two diamond": "uncommon",
    rare: "rare",
    "three diamond": "rare",
    "rare holo": "rare holo",
    "holo rare": "rare holo",
    "rare prime": "rare holo",
    "ace spec rare": "rare holo",
    "four diamond": "rare holo",
    "holo rare v": "rare holo v",
    "double rare": "rare holo v",
    "illustration rare": "rare holo v",
    "rare holo lv.x": "rare holo v",
    "holo rare vmax": "rare holo vmax",
    "holo rare vstar": "rare holo vstar",
    "ultra rare": "rare ultra",
    "special illustration rare": "rare ultra",
    legend: "rare ultra",
    "one star": "rare ultra",
    "full art trainer": "rare ultra",
    "two star": "rare rainbow alt",
    "secret rare": "rare secret",
    "hyper rare": "rare secret",
    "mega hyper rare": "rare secret",
    "black white rare": "rare secret",
    crown: "rare secret",
    "three star": "rare secret",
    "radiant rare": "radiant rare",
    "amazing rare": "amazing rare",
    "shiny rare": "rare shiny",
    "one shiny": "rare shiny",
    "shiny rare v": "rare shiny v",
    "shiny ultra rare": "rare shiny v",
    "two shiny": "rare shiny v",
    "shiny rare vmax": "rare shiny vmax",
};

/** The families a reverse-holo printing exists for; on any other the finish says nothing new. */
const REVERSIBLE = new Set(["common", "uncommon", "rare", "rare holo"]);
/** The families a holo copy lifts to a Rare Holo. */
const PLAIN = new Set(["common", "uncommon", "rare"]);

const TYPES = new Set(["water", "fire", "grass", "lightning", "psychic", "fighting", "darkness", "metal", "dragon", "fairy"]);

function stageSubtype(stage: string | null | undefined): string {
    const s = (stage ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (s === "stage1") return "stage 1";
    if (s === "stage2") return "stage 2";
    if (s === "vmax" || s === "vstar" || s === "v-union" || s === "mega") return s;
    return "basic";
}

export function holoVariant(
    rarity: string | null | undefined,
    finish: string | null | undefined,
    facts: { stage: string | null } | null | undefined,
    card: { number?: string | null; types?: string[] | null } = {},
): HoloVariant {
    const key = (rarity ?? "").trim().toLowerCase();
    let family = FAMILY[key] ?? "common";
    if (finish === "reverse-holo" && REVERSIBLE.has(family)) family = `${family} reverse holo`;
    else if (finish === "holo" && PLAIN.has(family)) family = "rare holo";

    const trainer = key === "full art trainer";
    return {
        rarity: family,
        subtypes: trainer ? "supporter" : stageSubtype(facts?.stage),
        supertype: trainer ? "trainer" : "pokémon",
        trainerGallery: /^[tg]g\d/i.test(card.number ?? ""),
        typeClasses: (card.types ?? []).map((t) => t.toLowerCase()).filter((t) => TYPES.has(t)),
    };
}
