import { describe, expect, it } from "vitest";
import type { CardFilter } from "@/lib/cards";
import { loadMoreInput } from "@/lib/list-filter";

describe("loadMoreInput", () => {
    it("keeps every filter a list page sends", () => {
        // The exact object `/dashboard/cards` builds and hands to `CardsList`, plus the offset the
        // list adds. Before `gen`, `type` and `number` were in the shape, zod dropped them without
        // a word and the second batch came back unfiltered.
        const sent = {
            q: "char",
            sort: "price",
            order: "desc",
            set: "Pitch Black",
            rarity: "Rare",
            gen: "Sword & Shield",
            type: "Fire",
            number: "085",
            priced: false,
            collectionId: "abc",
            favoritesOnly: true,
            wishlist: false,
            offset: 48,
        };

        const parsed = loadMoreInput.parse(sent);

        expect(parsed).toEqual(sent);
    });

    it("covers every field of CardFilter but facets", () => {
        // The type already fails a build when `CardFilter` grows a field this forgets. This says
        // the same thing at test time, so the reason is written down where the failure is read.
        const everyField: Required<Omit<CardFilter, "facets">> = {
            q: "a",
            collectionId: "b",
            favoritesOnly: false,
            wishlist: false,
            sort: "name",
            order: "asc",
            set: "c",
            rarity: "d",
            gen: "e",
            type: "f",
            number: "g",
            priced: true,
        };

        const parsed = loadMoreInput.parse({ ...everyField, offset: 0 });

        for (const key of Object.keys(everyField)) {
            expect(parsed).toHaveProperty(key);
        }
    });

    it("turns away an offset that is not a whole number in range", () => {
        expect(loadMoreInput.safeParse({ offset: -1 }).success).toBe(false);
        expect(loadMoreInput.safeParse({ offset: 1.5 }).success).toBe(false);
        expect(loadMoreInput.safeParse({ offset: 100_001 }).success).toBe(false);
    });
});
