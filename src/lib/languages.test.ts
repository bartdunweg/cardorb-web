import { describe, expect, it } from "vitest";
import { LANGUAGES, languageOf } from "./languages";

describe("languageOf", () => {
    it("reads not recorded as English", () => {
        expect(languageOf(null).code).toBe("en");
        expect(languageOf(undefined).code).toBe("en");
        expect(languageOf("??").code).toBe("en");
    });

    it("names a country for every language", () => {
        for (const l of LANGUAGES) expect(l.country).toMatch(/^[a-z]{2}$/);
        expect(languageOf("ja").country).toBe("jp");
    });
});
