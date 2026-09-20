import { describe, expect, it } from "vitest";
import { askedList, listFilter, listPath } from "@/lib/home-list";

/*
 * What `?value=` may say. The address is the one thing about Home a stranger writes, and the
 * answer goes straight into a cache key and an API filter, so anything that is not one of the
 * three shapes has to read as the collection rather than as itself.
 */
const UUID = "70b334a6-3a53-4ee5-905f-fd13a0d4ed9f";

describe("askedList", () => {
    const table: [name: string, asked: string | undefined, answer: string][] = [
        ["the favorites, by name", "favorites", "favorites"],
        ["the wishlist, by name", "wishlist", "wishlist"],
        ["a binder, by its uuid", UUID, UUID],
        ["a uuid in capitals, which is the same binder", UUID.toUpperCase(), UUID.toUpperCase()],
        ["nothing asked at all", undefined, "all"],
        ["an empty value", "", "all"],
        ["a path out of the address", "../", "all"],
        ["a path into another list", "../wishlist", "all"],
        ["a name that is nearly one of the three", "favorite", "all"],
        ["a uuid with something after it", `${UUID}x`, "all"],
        ["five hundred characters", "x".repeat(500), "all"],
        ["any other string", "the-dearest-ones", "all"],
        ["a tag of its own", "user:1:lists", "all"],
    ];

    for (const [name, asked, answer] of table) {
        it(`reads ${name} as ${answer === "all" ? "the collection" : answer}`, () => {
            expect(askedList(asked)).toBe(answer);
        });
    }
});

/* The three shapes above, and nothing else, decide which cards are read and where "See all" goes. */
describe("what a list is read as", () => {
    it("filters and links each of the three by itself, and the rest as the collection", () => {
        expect(listFilter("favorites")).toEqual({ favoritesOnly: true });
        expect(listFilter("wishlist")).toEqual({ wishlist: true });
        expect(listFilter(UUID)).toEqual({ collectionId: UUID });
        expect(listFilter("all")).toEqual({});

        expect(listPath("favorites")).toBe("/dashboard/favorites");
        expect(listPath("wishlist")).toBe("/dashboard/wishlist");
        expect(listPath("all")).toBe("/dashboard/cards");
        expect(listPath(UUID)).toBe(`/dashboard/collections/${UUID}`);
    });
});
