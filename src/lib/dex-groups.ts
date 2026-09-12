import type { DexSlot } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { type DexRange, GENERATIONS, NATIONAL_DEX_MAX, type PokedexSetting, rarityKept } from "@/lib/folder-rule";

/** What the catalogue says of a species: its name, and its official picture where the API has one. */
export type DexSpecies = Map<number, { name: string; artwork: string | null }>;
/** `artwork` is drawn only in a slot with no card: a held card is its own picture. */
export type NamedDexSlot = DexSlot & { name: string; artwork: string | null };

/**
 * One generation of the Pokédex as the page draws it: its slots, and its own "45 of 151". `caught`
 * and `total` are the page's numbers cut at the generation's edges (the sum over the generations is
 * the count at the top), so a chapter reads by the same rule as the whole.
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
    /** How many of it are held; a public card says nothing and counts once. */
    quantity?: number | null;
    /** What one copy is worth in euros; a public card carries none, and the value is then unknown. */
    price?: number | null;
    /** True for the card its slot shows: the one the owner left standing on the slider. */
    dex_face?: boolean | null;
};

/**
 * The numbers a Pokédex says about the cards in its slots, counted as a rule binder counts what
 * matches its rule: rows, copies (a card held twice is two), their worth, and the copies nothing
 * prices. The Pokédex is a binder with a rule of its own (the range and the rarities kept), so the
 * cards the rule leaves out (a trainer, a common when only the rares are kept) are not in these.
 * `value` is null when no card carries a price, as on a public profile.
 */
export type DexCount = { cards: number; copies: number; value: number | null; unpriced: number };

/**
 * The card a slot shows first: the one its owner left standing on the slider, then the rest in the
 * order the list gave them. Sort is stable in every engine this runs on, so "the rest" keeps its
 * order. Two cards of one species carrying the flag is not an error (another client may have left
 * one behind): the first one found leads, and the next swipe settles it.
 */
function faceFirst(held: DexCardLike[]): DexCardLike[] {
    if (!held.some((c) => c.dex_face)) return held;
    return [...held].sort((a, b) => Number(!!b.dex_face) - Number(!!a.dex_face));
}

export function groupByDex(
    cards: DexCardLike[],
    species: DexSpecies,
    setting: PokedexSetting,
): { slots: NamedDexSlot[]; generations: DexGeneration[]; caught: number; range: DexRange } & DexCount {
    const range = setting.dex ?? { from: 1, to: NATIONAL_DEX_MAX };
    // Only the rarities the setting names, compared without case: the catalogue spells some two ways.
    const kept = setting.rarities ?? null;
    const bySlot = new Map<number, DexCardLike[]>();
    const count: DexCount = { cards: 0, copies: 0, value: null, unpriced: 0 };
    for (const card of cards) {
        const id = card.species_id;
        if (id === null || id < range.from || id > range.to) continue;
        // Counted whatever its rarity, and that is the point: the cards and the worth say what you
        // hold, the way every other binder says it. The rarities answer one question, which is when
        // a Pokémon counts as caught, and they used to quietly take a thousand cards out of the
        // number above the grid as well (Bart's call, 2026-09-12).
        const copies = Math.max(0, card.quantity ?? 1);
        count.cards += 1;
        count.copies += copies;
        // A public card carries no price at all: nothing to sum, and no value to say.
        if (card.price === null) count.unpriced += copies;
        else if (card.price !== undefined) count.value = (count.value ?? 0) + card.price * copies;
        // The slots are the other question: a card in a rarity that does not count leaves its
        // Pokémon grey, so it is not one of the slot's cards either.
        if (kept && !rarityKept(kept, card.rarity, card.name)) continue;
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
            cards: faceFirst(held).map((c) => ({
                id: c.id,
                name: c.name,
                set: c.set_name ?? c.set ?? null,
                number: c.number,
                imageUrl: c.image_url,
                imageHighUrl: c.image_high_url,
                price: c.price ?? null,
                isFace: !!c.dex_face,
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
    if (count.value !== null) count.value = Math.round(count.value * 100) / 100;
    return { slots, generations, caught: bySlot.size, range, ...count };
}

/**
 * A folder as a Pokédex, with the numbers the page says about it. `total` is what the page walks
 * through (the rows in the slots; the list read more, and those are not shown), `copies`, `value`
 * and `unpriced` the slots' own, from `DexCount`.
 */
export type DexList = ReturnType<typeof groupByDex> & { total: number };
