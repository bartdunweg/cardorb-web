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
    /** The custom properties that place the foil window for the card's era; empty where the CSS's own (Sword & Shield) fit. */
    style: Record<string, string>;
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

/**
 * The series whose regular holo is the starry cosmos foil rather than Sword & Shield's sheen:
 * everything before Sword & Shield.
 */
const SHEEN_ERAS = new Set(["sword & shield", "scarlet & violet", "mega evolution", "pokémon tcg pocket"]);

/**
 * Where the picture sits, per era, as the CSS's clip properties. Measured on TCGdex scans at
 * 600 × 825: Sword & Shield, Scarlet & Violet and Mega Evolution share the window the vendored
 * CSS was written for (picture 9.85 % to 47.15 % down, 8 % in; trainers 14.5 % to 51.8 %); Sun &
 * Moon and XY sit within a percent of it and keep it. The Wizards-era frame (Base to e-Card) is
 * another shape: the picture starts lower and narrower, and a trainer's picture sits under a
 * TRAINER banner, a fifth of the way down.
 */
const CLASSIC_ERAS = new Set(["base", "gym", "neo", "legendary collection", "e-card"]);
const CLASSIC_WINDOW = {
    pokemon: "inset(11% 10.5% 48.5% 10.5%)",
    trainer: "inset(22.5% 9.5% 41.5% 9.5%)",
};
/** The card less the window: what a reverse holo's foil covers. */
function invert(inset: string): string {
    const [t, r, b, l] = inset.match(/[\d.]+%/g) as [string, string, string, string];
    const right = `calc(100% - ${r})`;
    const bottom = `calc(100% - ${b})`;
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${t}, ${l} ${t}, ${l} ${bottom}, ${right} ${bottom}, ${right} ${t}, 0 ${t})`;
}
function windowStyle(gen: string | null | undefined, trainer: boolean): Record<string, string> {
    if (!CLASSIC_ERAS.has((gen ?? "").trim().toLowerCase())) return {};
    const clip = trainer ? CLASSIC_WINDOW.trainer : CLASSIC_WINDOW.pokemon;
    const inv = invert(clip);
    return {
        "--clip": clip,
        "--clip-invert": inv,
        "--clip-stage": clip,
        "--clip-stage-invert": inv,
        "--clip-trainer": clip,
        "--clip-trainer-invert": inv,
    };
}

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
    facts: { stage: string | null; hp?: number | null } | null | undefined,
    card: { number?: string | null; types?: string[] | null; gen?: string | null } = {},
): HoloVariant {
    const key = (rarity ?? "").trim().toLowerCase();
    let family = FAMILY[key] ?? "common";
    if (finish === "reverse-holo" && REVERSIBLE.has(family)) family = `${family} reverse holo`;
    else if (finish === "holo" && PLAIN.has(family)) family = "rare holo";
    // The sheen is Sword & Shield's; every holo before it was the starry cosmos foil.
    if (family === "rare holo" && card.gen && !SHEEN_ERAS.has(card.gen.trim().toLowerCase())) family = "rare holo cosmos";

    // A trainer (or an energy) has no HP and no stage; the catalogue's facts say so once they land.
    const fullArtTrainer = key === "full art trainer";
    const trainer = fullArtTrainer || (facts != null && facts.hp == null && !facts.stage);
    return {
        rarity: family,
        style: windowStyle(card.gen, trainer),
        subtypes: trainer ? "supporter" : stageSubtype(facts?.stage),
        supertype: trainer ? "trainer" : "pokémon",
        trainerGallery: /^[tg]g\d/i.test(card.number ?? ""),
        typeClasses: (card.types ?? []).map((t) => t.toLowerCase()).filter((t) => TYPES.has(t)),
    };
}
