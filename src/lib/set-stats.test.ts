import { describe, expect, it } from "vitest";
import type { SetCard } from "@/lib/api-shapes";
import { setStats } from "@/lib/set-stats";

const card = (over: Partial<SetCard>): SetCard => ({
    id: "x",
    number: "1",
    name: "Bulbasaur",
    localName: null,
    setName: "151",
    setAbbr: null,
    rarity: null,
    category: null,
    trainerType: null,
    types: [],
    imageUrl: null,
    imageHighUrl: null,
    holding: { owned: false, wishlist: false, quantity: 0, itemIds: [] },
    price: null,
    tcgId: null,
    ...over,
});

describe("setStats", () => {
    it("counts the value like the progress, one of each card, out of the whole set's", () => {
        const stats = setStats(
            [
                card({ holding: { owned: true, wishlist: false, quantity: 2, itemIds: [] }, price: 3 }),
                card({ holding: { owned: true, wishlist: false, quantity: 1, itemIds: [] }, price: null }),
                card({ holding: { owned: false, wishlist: true, quantity: 0, itemIds: [] }, price: 10 }),
                card({ price: 5 }),
                card({}),
            ],
            5,
        );
        expect(stats).toEqual({ owned: 2, total: 5, value: 3, setValue: 18, unpriced: 2 });
    });

    // The API leaves the holding fields out for a reader it was given no credential for, so the two
    // numbers that are about a person have no answer. Zero is an answer, and the wrong one.
    it("counts nothing about a person where nobody was asked, and still prices the set", () => {
        const stats = setStats([card({ holding: null, price: 3 }), card({ holding: null, price: 5 }), card({ holding: null })], 3);
        expect(stats.owned).toBeNull();
        expect(stats.owned).not.toBe(0);
        expect(stats.value).toBeNull();
        expect(stats.value).not.toBe(0);
        // The set's own worth and size are catalogue facts, the same for everybody.
        expect(stats).toMatchObject({ total: 3, setValue: 8, unpriced: 1 });
    });

    it("keeps the counts numbers where the answer carried holdings, even at none held", () => {
        const stats = setStats([card({ price: 3 }), card({ price: 5 })], 2);
        expect(stats.owned).toBe(0);
        expect(stats.owned).not.toBeNull();
        expect(stats.value).toBe(0);
        expect(stats.value).not.toBeNull();
    });
});
