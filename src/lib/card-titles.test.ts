import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api-shapes";
import { distinctTitles, matchSets, matchTitles } from "@/lib/card-titles";
import { band } from "@/lib/name-rank";

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

describe("band", () => {
    it("puts the start of a name before the start of a word, and both before the middle", () => {
        expect(band("Charizard", "char")).toBe(0);
        expect(band("Giovanni's Charisma", "char")).toBe(1);
        expect(band("Pecharunt ex", "char")).toBe(2);
        expect(band("Pikachu", "char")).toBe(3);
    });
});

describe("matchTitles", () => {
    const titles = [
        { name: "Pecharunt ex", hint: "2 cards" },
        { name: "Charjabug", hint: "Temporal Forces" },
        { name: "Giovanni's Charisma", hint: "4 cards" },
        { name: "Charizard ex", hint: "3 cards" },
        { name: "Pikachu", hint: "5 cards" },
    ];

    it("answers what begins with the term first, and drops what does not hold it", () => {
        expect(matchTitles(titles, "char").map((t) => t.name)).toEqual(["Charjabug", "Charizard ex", "Giovanni's Charisma", "Pecharunt ex"]);
    });

    it("is blind to case and stops at the limit", () => {
        expect(matchTitles(titles, "CHAR", 2).map((t) => t.name)).toEqual(["Charjabug", "Charizard ex"]);
    });
});

describe("matchSets", () => {
    it("matches the name a person reads, not the address the URL carries", () => {
        const sets = [
            { name: "base1", title: "Base Set" },
            { name: "sv03.5", title: "151" },
        ];
        expect(matchSets(sets, "base").map((s) => s.name)).toEqual(["base1"]);
        expect(matchSets(sets, "sv03")).toEqual([]);
    });
});
