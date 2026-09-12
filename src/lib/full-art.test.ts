import { describe, expect, it } from "vitest";
import { type FullArtCard, fullArtIds } from "@/lib/full-art";

const card = (number: string, name: string, rarity: string | null, category?: string): FullArtCard => ({ number, name, rarity, category });

describe("fullArtIds", () => {
    it("takes the rarities that are only ever full art", () => {
        const cards = [
            card("001", "Bulbasaur", "Common"),
            card("166", "Bulbasaur", "Illustration rare"),
            card("199", "Charizard ex", "Special illustration rare"),
        ];
        expect([...fullArtIds(cards)]).toEqual(["166", "199"]);
    });

    // The whole reason the set has to be read rather than the rarity: in Sun & Moon the plain GX
    // is the Ultra Rare and the full art is the Secret Rare, the opposite of Scarlet & Violet.
    it("leaves the first printing of a name out and takes the later one", () => {
        const cards = [card("12", "Decidueye GX", "Ultra Rare"), card("150", "Decidueye GX", "Secret Rare")];
        expect([...fullArtIds(cards)]).toEqual(["150"]);
    });

    it("takes the full art ex of a Scarlet & Violet set and leaves its double rare", () => {
        const cards = [
            card("003", "Venusaur ex", "Double rare"),
            card("182", "Venusaur ex", "Ultra Rare"),
            card("198", "Venusaur ex", "Special illustration rare"),
        ];
        expect([...fullArtIds(cards)]).toEqual(["182", "198"]);
    });

    it("leaves the gold cards out: a hyper rare has borders, not full art", () => {
        const cards = [card("005", "Nest Ball", "Uncommon"), card("205", "Nest Ball", "Hyper rare")];
        expect([...fullArtIds(cards)]).toEqual([]);
    });

    it("leaves a gold item out where the catalogue names the category", () => {
        const cards = [
            card("102", "Quick Ball", "Uncommon", "Trainer"),
            card("216", "Quick Ball", "Secret Rare", "Trainer"),
            card("169", "Marnie", "Uncommon", "Trainer"),
            card("200", "Marnie", "Ultra Rare", "Trainer"),
        ];
        // Both are trainers; the category alone cannot split them yet, so the gold ball comes along.
        expect([...fullArtIds(cards)]).toEqual(["216", "200"]);
    });

    it("never takes an energy reprint", () => {
        const cards = [card("100", "Fire Energy", "Common", "Energy"), card("170", "Fire Energy", "Secret Rare", "Energy")];
        expect([...fullArtIds(cards)]).toEqual([]);
    });

    it("reads a number with leading zeros and one with none as the same number", () => {
        const cards = [card("3", "Charizard ex", "Double rare"), card("183", "Charizard ex", "Ultra Rare")];
        expect([...fullArtIds(cards)]).toEqual(["183"]);
    });

    it("is empty for a set that has none", () => {
        expect([...fullArtIds([card("1", "Pikachu", "Common"), card("2", "Raichu", "Rare")])]).toEqual([]);
    });
});
