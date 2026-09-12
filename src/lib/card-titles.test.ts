import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api-shapes";
import { distinctTitles } from "@/lib/card-titles";

const row = (name: string, set: string | null, id = `${name}-${set}-${Math.random()}`) => ({ id, name, set_name: set }) as Card;

describe("distinctTitles", () => {
    it("folds the rows to their names, in the order they came", () => {
        expect(distinctTitles([row("Charizard", "Base Set"), row("Charizard", "151"), row("Pikachu", "Base Set")]).map((t) => t.name)).toEqual([
            "Charizard",
            "Pikachu",
        ]);
    });

    it("names the set of a title held once, and counts the rest", () => {
        expect(distinctTitles([row("Pikachu", "Base Set")])[0].hint).toBe("Base Set");
        expect(distinctTitles([row("Charizard", "Base Set"), row("Charizard", "151")])[0].hint).toBe("2 cards");
    });

    it("says how many rather than nothing where the row names no set", () => {
        expect(distinctTitles([row("Mystery", null)])[0].hint).toBe("1 card");
    });

    it("offers no more than it was asked for", () => {
        expect(distinctTitles([row("A", "S"), row("B", "S"), row("C", "S")], 2)).toHaveLength(2);
    });
});
