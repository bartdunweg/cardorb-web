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
    { code: "zh", label: "Chinese", country: "cn" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type Language = (typeof LANGUAGES)[number];

/** The language a code names; not recorded (null) reads as English, which nearly every card is. */
export function languageOf(code: string | null | undefined): Language {
    return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * The catalogues a person can browse and add from: the English one, and TCGdex's Japanese,
 * Chinese (traditional and simplified) and Korean, each with its own sets and ids. `short` is
 * what a chip shows beside the flag; `country` the flag.
 */
export const BROWSE_LANGUAGES = [
    { code: "en", label: "English", short: "EN", country: "gb" },
    { code: "ja", label: "Japanese", short: "JA", country: "jp" },
    { code: "zh-tw", label: "Chinese (traditional)", short: "ZH", country: "tw" },
    { code: "zh-cn", label: "Chinese (simplified)", short: "ZH", country: "cn" },
    { code: "ko", label: "Korean", short: "KO", country: "kr" },
] as const;
export type BrowseLanguage = (typeof BROWSE_LANGUAGES)[number]["code"];
export const isBrowseLanguage = (v: unknown): v is BrowseLanguage => BROWSE_LANGUAGES.some((l) => l.code === v);
