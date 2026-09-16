import { describe, expect, it } from "vitest";
import { MAX_COOKIE_LENGTH, memoryKey, parseListMemory, serializeListMemory, withEntry } from "./list-memory";

describe("memoryKey", () => {
    it("is the page, except that every set page is one page", () => {
        expect(memoryKey("/dashboard/wishlist")).toBe("/dashboard/wishlist");
        expect(memoryKey("/dashboard/collections/abc")).toBe("/dashboard/collections/abc");
        expect(memoryKey("/dashboard/sets")).toBe("/dashboard/sets");
        expect(memoryKey("/dashboard/sets/sv1")).toBe("/dashboard/sets/*");
        expect(memoryKey("/user/bart")).toBe("/user/bart");
    });
});

describe("parseListMemory", () => {
    it("reads what serializeListMemory wrote", () => {
        const memory = { "/dashboard/cards": { view: "table" as const, query: "sort=name&rarity=Rare" }, "/dashboard/sets/*": { size: "lg" as const } };
        expect(parseListMemory(serializeListMemory(memory))).toEqual(memory);
    });

    it("reads a value the cookie jar already decoded", () => {
        expect(parseListMemory(JSON.stringify({ "/dashboard/cards": { size: "sm" } }))).toEqual({ "/dashboard/cards": { size: "sm" } });
    });

    it("is empty for nothing, nonsense and the wrong shape", () => {
        expect(parseListMemory(undefined)).toEqual({});
        expect(parseListMemory("")).toEqual({});
        expect(parseListMemory("not json")).toEqual({});
        expect(parseListMemory("%7B%22")).toEqual({});
        expect(parseListMemory(JSON.stringify({ "/dashboard/cards": { view: "huge" } }))).toEqual({});
        expect(parseListMemory(JSON.stringify(["/dashboard/cards"]))).toEqual({});
    });
});

describe("withEntry", () => {
    it("merges into the page's entry and moves the page to the end", () => {
        const before = { "/a": { size: "sm" as const }, "/b": { view: "grid" as const } };
        const after = withEntry(before, "/a", { view: "table" });
        expect(after).toEqual({ "/b": { view: "grid" }, "/a": { size: "sm", view: "table" } });
        expect(Object.keys(after)).toEqual(["/b", "/a"]);
    });

    it("drops a cleared query and a page left with nothing", () => {
        const before = { "/a": { query: "rarity=Rare" }, "/b": { size: "lg" as const } };
        expect(withEntry(before, "/a", { query: "" })).toEqual({ "/b": { size: "lg" } });
        expect(withEntry(before, "/b", { size: undefined })).toEqual({ "/a": { query: "rarity=Rare" } });
    });

    it("leaves the memory it was given alone", () => {
        const before = { "/a": { query: "rarity=Rare" } };
        withEntry(before, "/a", { query: "" });
        expect(before).toEqual({ "/a": { query: "rarity=Rare" } });
    });
});

describe("serializeListMemory", () => {
    it("forgets the oldest pages first once the cookie would be too long", () => {
        const memory: Record<string, { query: string }> = {};
        for (let i = 0; i < 40; i++) memory[`/dashboard/collections/${i}`] = { query: `set=${"x".repeat(150)}&page=${i}` };
        const text = serializeListMemory(memory);
        expect(text.length).toBeLessThanOrEqual(MAX_COOKIE_LENGTH);
        const kept = Object.keys(parseListMemory(text));
        expect(kept.length).toBeGreaterThan(0);
        expect(kept.length).toBeLessThan(40);
        expect(kept.at(-1)).toBe("/dashboard/collections/39");
        expect(kept).not.toContain("/dashboard/collections/0");
    });

    it("is empty for an empty memory and for entries that say nothing", () => {
        expect(serializeListMemory({})).toBe("");
        expect(serializeListMemory({ "/a": {} })).toBe("");
    });
});
