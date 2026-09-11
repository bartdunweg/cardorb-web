import type { DexSlot } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { type DexRange, NATIONAL_DEX_MAX, type PokedexSetting, rarityKept } from "@/lib/folder-rule";

export type DexNames = Map<number, string>;
export type NamedDexSlot = DexSlot & { name: string };

/**
 * A list of cards as a Pokédex: one slot per number in the range, the folder's cards in it in the
 * list's own order. A card without a number (a trainer, an energy) is not in any slot. With
 * `missing` off, the empty slots go; with it on they stay, named, so a person sees what to find.
 */
/** What a slot needs of a card: the owner's card and a public profile's both have it. */
/** `set` is what a public card does not carry; a public Pokédex opens nothing, so it needs none. */
export type DexCardLike = Pick<Card, "id" | "name" | "number" | "species_id" | "rarity" | "image_url" | "image_high_url"> & { set?: string | null };

export function groupByDex(
    cards: DexCardLike[],
    names: DexNames,
    setting: PokedexSetting,
): { slots: NamedDexSlot[]; caught: number; range: DexRange; cards: number } {
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
        slots.push({
            number,
            name: names.get(number) ?? `#${number}`,
            cards: held.map((c) => ({ id: c.id, name: c.name, set: c.set ?? null, number: c.number, imageUrl: c.image_url, imageHighUrl: c.image_high_url })),
        });
    }
    return { slots, caught: bySlot.size, range, cards: counted };
}

/** A folder as a Pokédex, with the numbers the page says about it: the slots, plus the list's own count and worth. */
export type DexList = ReturnType<typeof groupByDex> & { total: number; copies?: number; value: number | null; unpriced: number };
