/** The languages a copy is printed in, as the API codes them, with the country whose flag says it. */
export const LANGUAGES = [
    { code: "en", label: "English", country: "gb" },
    { code: "de", label: "German", country: "de" },
    { code: "fr", label: "French", country: "fr" },
    { code: "it", label: "Italian", country: "it" },
    { code: "es", label: "Spanish", country: "es" },
    { code: "pt", label: "Portuguese", country: "pt" },
    { code: "nl", label: "Dutch", country: "nl" },
    { code: "ja", label: "Japanese", country: "jp" },
    { code: "ko", label: "Korean", country: "kr" },
    /* Chinese is two catalogues and the API says which since cardorb-api#269. `zh` stays for the
       rows written before it said: one of the two, read as "Chinese". */
    { code: "zh", label: "Chinese", country: "cn" },
    { code: "zh-tw", label: "Traditional Chinese", country: "tw" },
    { code: "zh-cn", label: "Simplified Chinese", country: "cn" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/**
 * The languages a copy of a card from the English catalogue can be: the Western printings share
 * one set and one numbering, so an English card's copy may be German or Dutch. A card from the
 * Japanese, Chinese or Korean catalogue is in that language and no other; its language is the
 * catalogue's, not a choice.
 */
/**
 * Dutch is one of them. It was taken out on 2026-09-12 on the grounds that no Pokémon card is
 * printed in Dutch, which is wrong: Base Set, Jungle and Fossil were released in it, and nothing
 * after. TCGdex keeps no Dutch catalogue, so it can never be the answer to a per-card question;
 * the API answers those three sets from the set's own list instead (cardorb-api#347), and this
 * list is what a card whose languages nobody could name offers.
 */
export const WESTERN_LANGUAGES = LANGUAGES.filter((l) => ["en", "de", "fr", "it", "es", "pt", "nl"].includes(l.code));

/**
 * The languages a copy may be set to, given the language it is in (null: English) and, when the
 * API has said, the Western printings the card actually has (`printed`): a promo printed in
 * English alone offers English alone.
 *
 * Any Western language means the English catalogue: a German copy of Base Set is the English
 * set's card in German, and the copy can be set back to English, or to French. Until 2026-09-12
 * only "en" counted as that catalogue, so a copy once set to German offered German alone and
 * there was no way back to English from the sheet. A Japanese, Korean or Chinese copy is in that
 * language and no other; its language is the catalogue's, not a choice.
 */
export function languagesFor(catalogue: string | null | undefined, printed?: readonly string[] | null): readonly Language[] {
    if (!catalogue || WESTERN_LANGUAGES.some((l) => l.code === catalogue)) {
        if (!printed || printed.length === 0) return WESTERN_LANGUAGES;
        const only = WESTERN_LANGUAGES.filter((l) => printed.includes(l.code));
        return only.length ? only : WESTERN_LANGUAGES.slice(0, 1);
    }
    return [languageOf(catalogue)];
}
export type Language = (typeof LANGUAGES)[number];

/** The language a code names; not recorded (null) reads as English, which nearly every card is. */
export function languageOf(code: string | null | undefined): Language {
    return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * The catalogues a person can browse and add from: the English one and TCGdex's Japanese, each
 * with its own sets and ids. `short` is what a chip shows beside the flag, the word in full;
 * `country` the flag. Chinese (traditional and simplified) and Korean were offered too until
 * 2026-09-13, when Bart narrowed the start to English and Japanese; a copy already in one of
 * them still reads through `LANGUAGES`.
 */
export const BROWSE_LANGUAGES = [
    { code: "en", label: "English", short: "English", country: "gb" },
    { code: "ja", label: "Japanese", short: "Japanese", country: "jp" },
] as const;
export type BrowseLanguage = (typeof BROWSE_LANGUAGES)[number]["code"];
export const isBrowseLanguage = (v: unknown): v is BrowseLanguage => BROWSE_LANGUAGES.some((l) => l.code === v);
