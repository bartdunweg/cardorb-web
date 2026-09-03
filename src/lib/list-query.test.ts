import { describe, expect, it } from "vitest";
import { listHref, readListQuery } from "./list-query";

describe("readListQuery", () => {
    it("reads page and sort, and falls back to set order and page one for anything else", () => {
        expect(readListQuery({ page: "3", sort: "price-desc", q: " pika " })).toEqual({
            page: 3,
            sortKey: "price-desc",
            sort: "price",
            order: "desc",
            q: "pika",
        });
        expect(readListQuery({ page: "x", sort: "colour" })).toEqual({ page: 1, sortKey: "set", sort: undefined, order: undefined, q: undefined });
        expect(readListQuery({})).toMatchObject({ page: 1, sortKey: "set" });
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
