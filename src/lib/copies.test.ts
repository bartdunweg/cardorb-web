import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api-shapes";
import { sameCard, sortCopies } from "./copies";

const card = (over: Partial<Card>): Card =>
    ({ id: "r", name: "Pikachu", set: "base1", number: "25", language: null, finish: null, condition: null, grade: null, ...over }) as Card;

describe("copies", () => {
    it("knows one card from another by set, number and name", () => {
        expect(sameCard(card({}), card({ id: "s", language: "ja" }))).toBe(true);
        expect(sameCard(card({}), card({ number: "26" }))).toBe(false);
        expect(sameCard(card({}), card({ set: "base2" }))).toBe(false);
    });

    it("puts English first, then the rest by language", () => {
        const rows = sortCopies([card({ id: "ja", language: "ja" }), card({ id: "en" }), card({ id: "de", language: "de" })]);
        expect(rows.map((r) => r.id)).toEqual(["en", "de", "ja"]);
    });
});
