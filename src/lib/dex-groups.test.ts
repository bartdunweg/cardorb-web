import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/cards";
import { groupByDex } from "./dex-groups";

const card = (id: string, species_id: number | null): Card =>
    ({ id, name: id, species_id, image_url: null, owned: true, set_name: "Base Set", rarity: "Common" }) as unknown as Card;
const names = new Map([
    [1, "Bulbasaur"],
    [2, "Ivysaur"],
    [3, "Venusaur"],
    [25, "Pikachu"],
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
    it("drops the empty slots when the missing ones are not wanted", () => {
        const out = groupByDex([card("b", 3)], names, { missing: false, dex: { from: 1, to: 3 } });
        expect(out.slots.map((s) => s.number)).toEqual([3]);
    });
    it("spans the whole dex without a range", () => {
        expect(groupByDex([], names, { missing: true }).slots).toHaveLength(1025);
    });
});
