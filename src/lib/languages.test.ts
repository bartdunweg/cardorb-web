import { describe, expect, it } from "vitest";
import { LANGUAGES, languageOf, languagesFor } from "./languages";

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

    it("offers the Western printings for an English-catalogue card and one fixed language for the others", () => {
        expect(languagesFor(null).map((l) => l.code)).toEqual(["en", "de", "fr", "it", "es", "pt", "nl"]);
        expect(languagesFor("en").length).toBe(7);
        // A German copy is the English catalogue's card in German: every Western language stays on offer.
        expect(languagesFor("de").map((l) => l.code)).toEqual(["en", "de", "fr", "it", "es", "pt", "nl"]);
        expect(languagesFor("ja").map((l) => l.code)).toEqual(["ja"]);
        expect(languagesFor("zh-tw").map((l) => l.code)).toEqual(["zh-tw"]);
        expect(languagesFor("zh-cn").map((l) => l.code)).toEqual(["zh-cn"]);
        // A row from before the API told the two apart still reads as Chinese.
        expect(languageOf("zh").label).toBe("Chinese");
        expect(languagesFor("ko").map((l) => l.code)).toEqual(["ko"]);
        // A promo printed in English and Portuguese alone offers those alone.
        expect(languagesFor(null, ["en", "pt"]).map((l) => l.code)).toEqual(["en", "pt"]);
        expect(languagesFor(null, []).length).toBe(7);
    });
});
