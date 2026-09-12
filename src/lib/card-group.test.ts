import { describe, expect, it } from "vitest";
import { cardGroup, speciesTable } from "./card-group";

const table = speciesTable(
    [
        [29, "Nidoran♀"],
        [67, "Machop"],
        [68, "Machamp"],
        [122, "Mr. Mime"],
        [150, "Mewtwo"],
        [151, "Mew"],
        [25, "Pikachu"],
        [35, "Clefairy"],
        [140, "Kabuto"],
        [250, "Ho-Oh"],
        [479, "Rotom"],
        [644, "Zekrom"],
        [669, "Flabébé"],
        [772, "Type: Null"],
        [992, "Iron Hands"],
        [6, "Charizard"],
    ].map(([id, name]) => ({ id: id as number, name: name as string })),
);
const title = (name: string) => cardGroup(name, table).title;

describe("cardGroup", () => {
    it("puts every printing of a Pokémon under it, whatever stands around the name", () => {
        for (const name of ["Machamp", "Dark Machamp", "M Machamp EX", "Mega Machamp ex", "Machamp VMAX", "Machamp LV.X", "Brock's Machamp"])
            expect(title(name)).toBe("Machamp");
        expect(cardGroup("Dark Machamp", table).key).toBe(cardGroup("Machamp V", table).key);
        expect(title("Machop")).toBe("Machop");
    });

    it("takes the longer name where a shorter one is inside it", () => {
        expect(title("Mewtwo ex")).toBe("Mewtwo");
        expect(title("Mew ex")).toBe("Mew");
        expect(title("Iron Hands ex")).toBe("Iron Hands");
    });

    it("reads a name however the card spells it", () => {
        expect(title("Nidoran ♀")).toBe("Nidoran♀");
        expect(title("Ho Oh")).toBe("Ho-Oh");
        expect(title("Ho-Oh-GX")).toBe("Ho-Oh");
        expect(title("Mr Mime")).toBe("Mr. Mime");
        expect(title("Flabebe")).toBe("Flabébé");
        expect(title("Type: Null")).toBe("Type: Null");
        expect(title("Pikachu with Grey Felt Hat")).toBe("Pikachu");
    });

    it("gives a tag team a heading of its own, its Pokémon joined", () => {
        expect(cardGroup("Pikachu & Zekrom-GX", table)).toEqual({ key: "dex:25+644", title: "Pikachu & Zekrom" });
        expect(title("Mewtwo & Mew GX")).toBe("Mewtwo & Mew");
    });

    it("keeps a trainer and an energy under their own name, a species in it or not", () => {
        expect(cardGroup("Professor's Research", table)).toEqual({ key: "name:professorsresearch", title: "Professor's Research" });
        expect(cardGroup("Professor’s Research (Professor Oak)", table).key).toBe(cardGroup("Professor's Research", table).key);
        expect(title("Basic Fire Energy")).toBe("Basic Fire Energy");
        for (const name of ["Charizard Spirit Link", "Clefairy Doll", "Rotom Dex", "Rotom Bike", "Rotom Phone", "Drone Rotom", "Dome Fossil Kabuto"])
            expect(title(name)).toBe(name);
    });
});
