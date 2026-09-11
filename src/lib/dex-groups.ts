import type { DexSlot } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { type DexRange, GENERATIONS, NATIONAL_DEX_MAX, type PokedexSetting, rarityKept } from "@/lib/folder-rule";

/** What the catalogue says of a species: its name, and its official picture where the API has one. */
export type DexSpecies = Map<number, { name: string; artwork: string | null }>;
/** `artwork` is drawn only in a slot with no card: a held card is its own picture. */
export type NamedDexSlot = DexSlot & { name: string; artwork: string | null };

/**
 * One generation of the Pokédex as the page draws it: its slots, and its own "45 of 151". `caught`
 * and `total` are the page's numbers cut at the generation's edges — the sum over the generations is
 * the count at the top — so a chapter reads by the same rule as the whole.
 */
export type DexGeneration = { label: string; from: number; to: number; slots: NamedDexSlot[]; caught: number; total: number };

/**
 * A list of cards as a Pokédex: one slot per number in the range, the folder's cards in it in the
 * list's own order. A card without a number (a trainer, an energy) is not in any slot. With
 * `missing` off, the empty slots go; with it on they stay, named, so a person sees what to find.
 */
/** What a slot needs of a card: the owner's card and a public profile's both have it. */
/** `set` is what a public card does not carry; a public Pokédex opens nothing, so it needs none. */
export type DexCardLike = Pick<Card, "id" | "name" | "number" | "species_id" | "rarity" | "image_url" | "image_high_url"> & {
    set?: string | null;
    set_name?: string | null;
};

export function groupByDex(
    cards: DexCardLike[],
    species: DexSpecies,
    setting: PokedexSetting,
): { slots: NamedDexSlot[]; generations: DexGeneration[]; caught: number; range: DexRange; cards: number } {
    const range = setting.dex ?? { from: 1, to: NATIONAL_DEX_MAX };
    // Only the rarities the setting names, compared without case: the catalogue spells some two ways.
    const kept = setting.rarities ?? null;
    const bySlot = new Map<number, DexCardLike[]>();
    let counted = 0;
    for (const card of cards) {
        const id = card.species_id;
        if (id === null || id < range.from || id > range.to) continue;
        if (kept && !rarityKept(kept, card.rarity, card.name)) continue;
        counted += 1;
        const list = bySlot.get(id) ?? [];
        list.push(card);
        bySlot.set(id, list);
    }
    const slots: NamedDexSlot[] = [];
    for (let number = range.from; number <= range.to; number += 1) {
        const held = bySlot.get(number) ?? [];
        if (held.length === 0 && !setting.missing) continue;
        const known = species.get(number);
        slots.push({
            number,
            name: known?.name ?? `#${number}`,
            artwork: known?.artwork ?? null,
            cards: held.map((c) => ({
                id: c.id,
                name: c.name,
                set: c.set_name ?? c.set ?? null,
                number: c.number,
                imageUrl: c.image_url,
                imageHighUrl: c.image_high_url,
            })),
        });
    }
    // The slots by generation, in dex order. A generation the range does not reach is not in the
    // list, and neither is one without a slot to draw (with the missing ones off, a generation nothing
    // is held in): a heading over nothing says less than no heading.
    const generations: DexGeneration[] = [];
    for (const gen of GENERATIONS) {
        const from = Math.max(gen.from, range.from);
        const to = Math.min(gen.to, range.to);
        if (from > to) continue;
        const held = slots.filter((s) => s.number >= from && s.number <= to);
        if (held.length === 0) continue;
        generations.push({ label: gen.label, from, to, slots: held, caught: held.filter((s) => s.cards.length > 0).length, total: to - from + 1 });
    }
    return { slots, generations, caught: bySlot.size, range, cards: counted };
}

/** A folder as a Pokédex, with the numbers the page says about it: the slots, plus the list's own count and worth. */
export type DexList = ReturnType<typeof groupByDex> & { total: number; copies?: number; value: number | null; unpriced: number };
