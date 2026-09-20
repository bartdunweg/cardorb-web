import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOGUE_NOT_ANSWERING } from "@/lib/read-failure";

/*
 * One fault, one sentence. Three screens said "The card service didn't answer" while the set
 * pages, the binders and the sheet called the same thing the card catalogue; this holds the three
 * to the shared constant, so the next screen that has to say it does not invent a fourth wording.
 */
const SCREENS = ["src/components/app/app-error-state.tsx", "src/components/app/command-search-menu.tsx", "src/components/app/binder-add-button.tsx"];

describe("the sentence for a catalogue that did not answer", () => {
    it("says card catalogue, as the rest of the app does", () => {
        expect(CATALOGUE_NOT_ANSWERING).toBe("The card catalogue is not answering.");
    });

    it("is the constant on every screen that shows it, never its own words", () => {
        for (const file of SCREENS) {
            const source = readFileSync(file, "utf8");
            expect(source, `${file} spells the sentence out`).not.toMatch(/card service/);
            expect(source, `${file} does not use the shared sentence`).toMatch(/CATALOGUE_NOT_ANSWERING/);
        }
    });
});
