import { describe, expect, it } from "vitest";
import { MAX_PAGE, listHref, readListQuery, readPublicListQuery } from "./list-query";

describe("readListQuery", () => {
    it("reads page and sort, and falls back to set order and page one for anything else", () => {
        expect(readListQuery({ page: "3", sort: "added-desc", q: " pika " })).toEqual({
            page: 3,
            sortKey: "added-desc",
            sort: "added",
            order: "desc",
            q: "pika",
            fullArt: false,
            unpriced: false,
        });
        expect(readListQuery({ page: "x", sort: "colour" })).toEqual({
            page: 1,
            sortKey: "set",
            sort: undefined,
            order: undefined,
            q: undefined,
            fullArt: false,
            unpriced: false,
        });
        expect(readListQuery({})).toMatchObject({ page: 1, sortKey: "set" });
    });
});

describe("full art in the URL", () => {
    /* Not a rarity: it cuts across them, so it is its own parameter and choosing one clears the
       other. The menu shows the two in one list all the same, which is where they belong. */
    it("reads ?fullArt=1 and writes it back, and the two never stand together", () => {
        expect(readListQuery({ fullArt: "1" }).fullArt).toBe(true);
        expect(readListQuery({ fullArt: "true" }).fullArt).toBe(false);
        expect(readListQuery({}).fullArt).toBe(false);
        const query = readListQuery({ rarity: "Rare" });
        expect(listHref("/dashboard/cards", query, { fullArt: true, rarity: undefined })).toBe("/dashboard/cards?fullArt=1");
        expect(listHref("/dashboard/cards", readListQuery({ fullArt: "1" }), { fullArt: false, rarity: "Rare" })).toBe("/dashboard/cards?rarity=Rare");
    });
});

describe("the page ceiling", () => {
    it("caps a page nobody could have reached", () => {
        // Every distinct page is a cache miss and one call to an API in another region, and
        // `?page=` was unbounded on a page a stranger can open.
        expect(readListQuery({ page: "999999999" }).page).toBe(MAX_PAGE);
        expect(readListQuery({ page: String(MAX_PAGE + 1) }).page).toBe(MAX_PAGE);
    });

    it("leaves a page somebody could have reached alone", () => {
        expect(readListQuery({ page: "7" }).page).toBe(7);
        expect(readListQuery({ page: String(MAX_PAGE) }).page).toBe(MAX_PAGE);
        expect(readListQuery({ page: "-3" }).page).toBe(1);
        expect(readListQuery({ page: "nonsense" }).page).toBe(1);
    });
});

describe("listHref", () => {
    const q = readListQuery({ page: "2", sort: "name", q: "pika" });
    it("keeps the search and the sort while changing the page, and omits defaults", () => {
        expect(listHref("/dashboard/cards", q, { page: 3 })).toBe("/dashboard/cards?q=pika&sort=name&page=3");
        expect(listHref("/dashboard/cards", q, { page: 1 })).toBe("/dashboard/cards?q=pika&sort=name");
        expect(listHref("/dashboard/cards", q, { sortKey: "set", page: 1 })).toBe("/dashboard/cards?q=pika");
        expect(listHref("/dashboard/cards", readListQuery({}), {})).toBe("/dashboard/cards");
    });
});

describe("set and rarity", () => {
    it("travel in the URL beside the sort and the search", () => {
        const q = readListQuery({ set: "Jungle", rarity: "Rare", sort: "name" });
        expect(q).toMatchObject({ set: "Jungle", rarity: "Rare", sortKey: "name" });
        expect(listHref("/dashboard/cards", q, { page: 2 })).toBe("/dashboard/cards?sort=name&set=Jungle&rarity=Rare&page=2");
        expect(listHref("/dashboard/cards", q, { set: undefined, page: 1 })).toBe("/dashboard/cards?sort=name&rarity=Rare");
        expect(readListQuery({ set: "  " }).set).toBeUndefined();
    });
});

describe("readPublicListQuery", () => {
    it("opens on the newest card, and keeps the orders a public list can do", () => {
        // A bare URL is newest first: a profile opens on what its owner pulled last.
        expect(readPublicListQuery({})).toMatchObject({ sortKey: "added-desc", sort: "added", order: "desc" });
        expect(readPublicListQuery({ sort: "name", q: "mew" })).toMatchObject({ sortKey: "name", sort: "name", q: "mew" });
        expect(readPublicListQuery({ sort: "set", set: "jungle" })).toMatchObject({ sortKey: "set", sort: undefined, order: undefined, set: "jungle" });
    });

    it("drops a sort the public route refuses back to the newest", () => {
        expect(readPublicListQuery({ sort: "price-desc" })).toMatchObject({ sortKey: "added-desc", sort: "added", order: "desc" });
        expect(readPublicListQuery({ sort: "dex" })).toMatchObject({ sortKey: "added-desc", sort: "added", order: "desc" });
    });
});
