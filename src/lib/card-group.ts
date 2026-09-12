/**
 * Which Pokémon a card is of, read from its name, so a search can put every printing of one
 * Pokémon under one heading.
 *
 * "machamp" answered Machamp, Dark Machamp, M Machamp EX and Machamp VMAX as a list of strangers,
 * where a collector reads them as one Pokémon (Bart, 2026-09-13). The catalogue document carries
 * no Dex number, only the name, so the name is read against every species' English name: the
 * first species a card's name holds is the card's, and a tag team is its Pokémon together.
 * Everything else (a trainer, an energy) is its own heading by its own name, which puts every
 * printing of Professor's Research together.
 *
 * Measured against every name in the English catalogue on 2026-09-13 (4,530 names): every
 * Pokémon card but "Buried Fossil", which names none, found its species. 48 trainer names hold
 * a species too; they are what `TRAINER_WORDS` is, and the tests carry one of each kind.
 */

/** A species by its name squeezed to letters, digits and the two Nidoran signs. */
export type SpeciesTable = Map<string, { id: number; name: string }>;

/** The heading a card goes under: a species, or its own name. `key` is what two cards share. */
export type CardGroup = { key: string; title: string };

/** "Mr. Mime", "Mr Mime" and "mr.mime" are one name; so are "Ho-Oh" and "Ho Oh", "Flabébé" and "Flabebe". */
const squeeze = (s: string) =>
    s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9♀♂]/g, "");

export function speciesTable(entries: readonly { id: number; name: string }[]): SpeciesTable {
    return new Map(entries.map((e) => [squeeze(e.name), { id: e.id, name: e.name }]));
}

/**
 * Trainer cards whose name holds a species: the Spirit Links, the dolls, the Rotom gadgets, the
 * fossils and Drone Rotom. Each word here was found in a trainer's name and in no Pokémon's.
 */
const TRAINER_WORDS = /\b(spirit link|doll|dex|bike|phone|fossil|old amber)\b|^(drone|ange) /i;

/** The most words a species name runs to: "Type: Null", "Tapu Koko", "Iron Jugulis". */
const MAX_SPECIES_WORDS = 2;

/**
 * The first species a part of a name holds. At each word the longer reading goes first, so
 * "Iron Hands" is not taken for anything shorter, and a hyphenated word drops its tail until it
 * is a species or nothing: "Ho-Oh-GX", "Pikachu-GX".
 */
function speciesOf(name: string, table: SpeciesTable) {
    const words = name.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++)
        for (let span = Math.min(MAX_SPECIES_WORDS, words.length - i); span >= 1; span--) {
            let text = words.slice(i, i + span).join(" ");
            for (;;) {
                const hit = table.get(squeeze(text));
                if (hit) return hit;
                if (!text.includes("-")) break;
                text = text.slice(0, text.lastIndexOf("-"));
            }
        }
    return null;
}

/**
 * A tag team is a heading of its own, its Pokémon joined as the card joins them: "Marshadow &
 * Machamp GX" under Marshadow read as a Marshadow in a search for Machamp.
 */
export function cardGroup(name: string, table: SpeciesTable): CardGroup {
    const species = TRAINER_WORDS.test(name)
        ? []
        : name
              .split("&")
              .map((part) => speciesOf(part, table))
              .filter((s) => s !== null);
    if (!species.length) {
        // One trainer however the apostrophe is typed, and with the professor it names or without:
        // "Professor’s Research (Professor Oak)" is a Professor's Research.
        const title = name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name.trim();
        return { key: `name:${squeeze(title)}`, title };
    }
    return { key: `dex:${species.map((s) => s.id).join("+")}`, title: species.map((s) => s.name).join(" & ") };
}
