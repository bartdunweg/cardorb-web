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
