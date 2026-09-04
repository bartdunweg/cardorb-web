/**
 * The theme's boot script and what it agrees on with the provider in `src/providers/theme.tsx`.
 *
 * The script runs before first paint, from the root layout's <head>, so a dark page never
 * flashes light. It is a string literal, not a stringified function: the same bytes are hashed
 * into the Content-Security-Policy (`src/lib/csp.ts`) and rendered into the page, and a
 * function's text differs between bundles. `theme-script.test.ts` checks the hash still matches.
 */

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);

/** localStorage key and the class on <html>: the same next-themes used, so a saved choice still counts. */
export const STORAGE_KEY = "theme";
export const DARK_CLASS = "dark-mode";
export const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

export const BOOT_SCRIPT =
    '(function(){var s=null;try{s=localStorage.getItem("theme")}catch(e){}var d=s==="light"||s==="dark"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark-mode",d==="dark");document.documentElement.style.colorScheme=d})()';

/** `sha256-` + base64 of BOOT_SCRIPT, what the CSP names. Recompute when the script changes; the test tells you. */
export const BOOT_SCRIPT_HASH = "w5E/C1HqteZoMiv05Vmjj1Qc5MuLyIDJolnJmKGrfhI=";
