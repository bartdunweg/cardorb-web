import { describe, expect, it } from "vitest";
import { readSetQuery, writeSetQuery } from "./set-query";

const params = (s: string) => new URLSearchParams(s);

describe("readSetQuery", () => {
    it("reads nothing as the plain page", () => {
        expect(readSetQuery(params(""))).toEqual({ q: "", holding: undefined, rarity: [], fullArt: false, sort: "set" });
    });

    it("reads the search, the tab, the rarities, full art and the sort", () => {
        expect(readSetQuery(params("q=char&holding=missing&rarity=Rare&rarity=Promo&fullArt=1&sort=price-desc"))).toEqual({
            q: "char",
            holding: "missing",
            rarity: ["Rare", "Promo"],
            fullArt: true,
            sort: "price-desc",
        });
    });

    it("falls back on nonsense rather than failing", () => {
        const q = readSetQuery(params("holding=stolen&sort=colour&rarity=&rarity=Rare&rarity=Rare&fullArt=yes"));
        expect(q).toEqual({ q: "", holding: undefined, rarity: ["Rare"], fullArt: false, sort: "set" });
    });
});

describe("writeSetQuery", () => {
    it("leaves defaults out and keeps what is not its own", () => {
        const written = writeSetQuery(params("language=ja&rarity=Old"), { q: "  ", holding: undefined, rarity: [], fullArt: false, sort: "set" });
        expect(written.toString()).toBe("language=ja");
    });

    it("writes every choice, the rarities as the key repeated", () => {
        const written = writeSetQuery(params("language=ja"), { q: "char", holding: "owned", rarity: ["Rare", "Promo"], fullArt: true, sort: "name" });
        expect(written.toString()).toBe("language=ja&q=char&holding=owned&rarity=Rare&rarity=Promo&fullArt=1&sort=name");
        expect(readSetQuery(written)).toEqual({ q: "char", holding: "owned", rarity: ["Rare", "Promo"], fullArt: true, sort: "name" });
    });
});
