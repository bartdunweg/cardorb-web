import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/cards";
import { groupByDex } from "./dex-groups";

const card = (id: string, species_id: number | null): Card =>
    ({ id, name: id, species_id, image_url: null, owned: true, set_name: "Base Set", rarity: "Common" }) as unknown as Card;
const art = (id: number) => `https://api.cardorb.com/artwork/pokedex/${id}.png`;
const names = new Map([
    [1, { name: "Bulbasaur", artwork: art(1) }],
    [2, { name: "Ivysaur", artwork: art(2) }],
    [3, { name: "Venusaur", artwork: art(3) }],
    [25, { name: "Pikachu", artwork: art(25) }],
]);

describe("groupByDex", () => {
    it("fills the slots of the range, keeps the list order in a slot, and leaves the numberless out", () => {
        const out = groupByDex([card("b", 3), card("p1", 25), card("potion", null), card("p2", 25), card("far", 152)], names, {
            missing: true,
            dex: { from: 1, to: 25 },
        });
        expect(out.slots).toHaveLength(25);
        expect(out.slots[0]).toMatchObject({ number: 1, name: "Bulbasaur", cards: [] });
        expect(out.slots[24].cards.map((c) => c.id)).toEqual(["p1", "p2"]);
        expect(out.caught).toBe(2);
        expect(out.cards).toBe(3);
        expect(out.range).toEqual({ from: 1, to: 25 });
    });
    it("counts every card in the range, whatever its rarity, and leaves the range's outside out", () => {
        // The rarities say when a Pokémon counts as caught, not what you hold: a card of a rarity
        // that does not count is still a card of yours, and still worth what it is worth.
        const held = (id: string, species_id: number, quantity: number | null, price: number | null, rarity = "Common") =>
            ({ ...card(id, species_id), quantity, price, rarity }) as Card;
        const out = groupByDex(
            [held("b", 1, 2, 1.5), held("i", 2, null, null), held("far", 152, 3, 9), held("rare", 3, 1, 4, "Rare"), card("potion", null)],
            names,
            { missing: true, dex: { from: 1, to: 25 }, rarities: ["Common"] },
        );
        expect(out.cards).toBe(3);
        expect(out.copies).toBe(4);
        expect(out.value).toBe(7);
        expect(out.unpriced).toBe(1);
        // The rare one counts for nothing here: its Pokémon stays grey.
        expect(out.caught).toBe(2);
        expect(out.slots.find((s) => s.number === 3)?.cards).toEqual([]);
    });
    it("puts the card that leads a slot first, and leaves the rest in the order they came", () => {
        const face = { ...card("p2", 25), dex_face: true } as Card;
        const out = groupByDex([card("p1", 25), face, card("p3", 25)], names, { missing: false });
        expect(out.slots[0].cards.map((c) => c.id)).toEqual(["p2", "p1", "p3"]);
        expect(out.slots[0].cards[0].isFace).toBe(true);
        expect(out.slots[0].cards[1].isFace).toBe(false);
    });
    it("takes the first flag where two cards of a species carry one", () => {
        const one = { ...card("a", 25), dex_face: true } as Card;
        const two = { ...card("b", 25), dex_face: true } as Card;
        const out = groupByDex([one, two], names, { missing: false });
        expect(out.slots[0].cards.map((c) => c.id)).toEqual(["a", "b"]);
    });
    it("hands a slot's card its price, so the tile can say what the card in view is worth", () => {
        const held = { ...card("p", 25), price: 12.5 } as Card;
        const out = groupByDex([held], names, { missing: false });
        expect(out.slots[0].cards[0].price).toBe(12.5);
    });
    it("says no value for cards that carry no price at all, as a public profile's", () => {
        const out = groupByDex([card("b", 1)], names, { missing: false });
        expect(out.copies).toBe(1);
        expect(out.value).toBeNull();
    });
    it("hands an empty slot its species' picture, and a slot nobody knows nothing", () => {
        const out = groupByDex([], names, { missing: true, dex: { from: 1, to: 4 } });
        expect(out.slots[0]).toMatchObject({ number: 1, name: "Bulbasaur", artwork: art(1) });
        expect(out.slots[3]).toMatchObject({ number: 4, name: "#4", artwork: null });
    });
    it("drops the empty slots when the missing ones are not wanted", () => {
        const out = groupByDex([card("b", 3)], names, { missing: false, dex: { from: 1, to: 3 } });
        expect(out.slots.map((s) => s.number)).toEqual([3]);
    });
    it("spans the whole dex without a range", () => {
        expect(groupByDex([], names, { missing: true }).slots).toHaveLength(1025);
    });
    it("splits the slots by generation, each with its own count, and the counts add up to the whole", () => {
        const out = groupByDex([card("b", 3), card("p", 25), card("chik", 152), card("far", 900)], names, { missing: true });
        expect(out.generations).toHaveLength(9);
        expect(out.generations[0]).toMatchObject({ label: "Gen 1 · Kanto", from: 1, to: 151, caught: 2, total: 151 });
        expect(out.generations[0]!.slots).toHaveLength(151);
        expect(out.generations[1]).toMatchObject({ label: "Gen 2 · Johto", from: 152, to: 251, caught: 1, total: 100 });
        expect(out.generations[7]).toMatchObject({ caught: 1, total: 96 });
        expect(out.generations.reduce((n, g) => n + g.caught, 0)).toBe(out.caught);
        expect(out.generations.reduce((n, g) => n + g.total, 0)).toBe(1025);
        expect(out.generations.flatMap((g) => g.slots)).toEqual(out.slots);
    });
    it("cuts the generations at the range's edges and leaves out the ones it does not reach", () => {
        const out = groupByDex([card("chik", 152)], names, { missing: true, dex: { from: 100, to: 200 } });
        expect(out.generations.map((g) => [g.label, g.from, g.to, g.caught, g.total])).toEqual([
            ["Gen 1 · Kanto", 100, 151, 0, 52],
            ["Gen 2 · Johto", 152, 200, 1, 49],
        ]);
    });
    it("leaves out a generation with nothing to draw when the missing ones are off", () => {
        const out = groupByDex([card("chik", 152)], names, { missing: false });
        expect(out.generations.map((g) => [g.label, g.caught, g.total])).toEqual([["Gen 2 · Johto", 1, 100]]);
    });
});
