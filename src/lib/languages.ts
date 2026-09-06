/** The languages a copy is printed in, as the API codes them, with the flag a person knows them by. */
export const LANGUAGES = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "de", label: "German", flag: "🇩🇪" },
    { code: "fr", label: "French", flag: "🇫🇷" },
    { code: "it", label: "Italian", flag: "🇮🇹" },
    { code: "es", label: "Spanish", flag: "🇪🇸" },
    { code: "pt", label: "Portuguese", flag: "🇵🇹" },
    { code: "nl", label: "Dutch", flag: "🇳🇱" },
    { code: "ja", label: "Japanese", flag: "🇯🇵" },
    { code: "ko", label: "Korean", flag: "🇰🇷" },
    { code: "zh", label: "Chinese", flag: "🇨🇳" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
