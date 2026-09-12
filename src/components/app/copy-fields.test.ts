import { describe, expect, it } from "vitest";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { editionOptions } from "./copy-fields";

/** Only the one field these read; the rest of the facts is not this question. */
const facts = (firstEdition: boolean | null): CardFacts => ({ firstEdition, printings: [], languages: ["en"] }) as unknown as CardFacts;

describe("editionOptions", () => {
    it("asks nothing of a card that was only ever printed once", () => {
        expect(editionOptions(facts(false), null)).toEqual([]);
    });

    it("offers the three runs where the catalogue says a stamped one exists", () => {
        expect(editionOptions(facts(true), null).map((o) => o.value)).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
    });

    it("offers them where the catalogue said nothing, rather than none", () => {
        expect(editionOptions(facts(null), null).map((o) => o.value)).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
        expect(editionOptions(null, null).map((o) => o.value)).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
    });

    it("keeps asking where a run is already recorded, whatever the catalogue says", () => {
        // A select whose value is not among its options shows blank, and saving the form would
        // quietly clear what somebody recorded.
        expect(editionOptions(facts(false), "1st-edition").map((o) => o.value)).toContain("1st-edition");
    });
});
