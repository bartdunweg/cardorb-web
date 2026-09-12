import { describe, expect, it } from "vitest";
import type { SetCard } from "@/lib/api-shapes";
import { secretCount, setStats } from "@/lib/set-stats";

const card = (over: Partial<SetCard>): SetCard => ({
    id: "x",
    number: "1",
    name: "Bulbasaur",
    localName: null,
    setName: "151",
    rarity: null,
    category: null,
    trainerType: null,
    types: [],
    imageUrl: null,
    imageHighUrl: null,
    owned: false,
    wishlist: false,
    quantity: 0,
    itemIds: [],
    price: null,
    tcgId: null,
    ...over,
});

describe("setStats", () => {
    it("counts the copies held into the value and the cards missing into the cost", () => {
        const stats = setStats(
            [
                card({ owned: true, quantity: 2, price: 3 }),
                card({ owned: true, quantity: 1, price: null }),
                card({ wishlist: true, price: 10 }),
                card({ price: 5 }),
                card({}),
            ],
            5,
        );
        expect(stats).toEqual({ owned: 2, total: 5, value: 6, toComplete: 15, unpriced: 1, wishlist: 1 });
    });
});

describe("secretCount", () => {
    it("names the cards past the printed number", () => {
        expect(secretCount(207, 165)).toBe(42);
    });
    it("says nothing where the counts agree or one is missing", () => {
        expect(secretCount(102, 102)).toBeNull();
        expect(secretCount(102, null)).toBeNull();
    });
});
