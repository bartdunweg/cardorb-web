import type { DexSlot } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import type { DexRange, PokedexSetting } from "@/lib/folder-rule";
import { NATIONAL_DEX_MAX } from "@/lib/pokedex";

export type DexNames = Map<number, string>;
export type NamedDexSlot = DexSlot & { name: string };

/**
 * A list of cards as a Pokédex: one slot per number in the range, the folder's cards in it in the
 * list's own order. A card without a number (a trainer, an energy) is not in any slot. With
 * `missing` off, the empty slots go; with it on they stay, named, so a person sees what to find.
 */
export function groupByDex(cards: Card[], names: DexNames, setting: PokedexSetting): { slots: NamedDexSlot[]; caught: number; range: DexRange; cards: number } {
    const range = setting.dex ?? { from: 1, to: NATIONAL_DEX_MAX };
    const bySlot = new Map<number, Card[]>();
    let counted = 0;
    for (const card of cards) {
        const id = card.species_id;
        if (id === null || id < range.from || id > range.to) continue;
        counted += 1;
        const list = bySlot.get(id) ?? [];
        list.push(card);
        bySlot.set(id, list);
    }
    const slots: NamedDexSlot[] = [];
    for (let number = range.from; number <= range.to; number += 1) {
        const held = bySlot.get(number) ?? [];
        if (held.length === 0 && !setting.missing) continue;
        slots.push({ number, name: names.get(number) ?? `#${number}`, cards: held.map((c) => ({ id: c.id, name: c.name, imageUrl: c.image_url })) });
    }
    return { slots, caught: bySlot.size, range, cards: counted };
}
