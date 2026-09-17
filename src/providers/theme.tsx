"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { DARK_CLASS, STORAGE_KEY, SYSTEM_QUERY, type Theme, isTheme } from "@/lib/theme-script";

/**
 * Light, dark or follow the system. The boot script in `src/lib/theme-script.ts` has already put
 * the class on <html> before this mounts; this provider keeps it in step with the choice and the
 * system from then on, and hands the choice to whoever asks.
 *
 * Both values are undefined on the server and the first client render, so a component that draws
 * something theme-dependent hydrates without a mismatch and resolves right after.
 */

type Resolved = "light" | "dark";
type ThemeContextValue = { theme: Theme | undefined; resolvedTheme: Resolved | undefined; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CHANGE_EVENT = "theme-change";
const undefinedOnServer = () => undefined;

const readStored = (): Theme => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isTheme(stored) ? stored : "system";
    } catch {
        return "system";
    }
};

// The choice: localStorage, told about by this tab's setTheme and by other tabs' storage events.
const subscribeStored = (onChange: () => void) => {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
};

const readSystem = (): Resolved => (matchMedia(SYSTEM_QUERY).matches ? "dark" : "light");
const subscribeSystem = (onChange: () => void) => {
    const media = matchMedia(SYSTEM_QUERY);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
};

function setTheme(next: Theme) {
    try {
        if (next === "system") localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
    } catch {
        /* no storage: nothing to keep, the page stays as it is */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(subscribeStored, readStored, undefinedOnServer);
    const system = useSyncExternalStore(subscribeSystem, readSystem, undefinedOnServer);
    const resolvedTheme = theme && system ? (theme === "system" ? system : theme) : undefined;

    const applied = useRef<Resolved | undefined>(undefined);
    useEffect(() => {
        if (!resolvedTheme) return;
        const root = document.documentElement;
        // A switch after the first paint would fire every colour transition on the page at once and
        // smear. Transitions go off for the swap, one reflow pins it, and they return on the next frame.
        const swap = applied.current !== undefined && applied.current !== resolvedTheme;
        const still = swap ? document.createElement("style") : null;
        if (still) {
            still.textContent = "*,*::before,*::after{transition:none !important}";
            document.head.appendChild(still);
        }
        root.classList.toggle(DARK_CLASS, resolvedTheme === "dark");
        root.style.colorScheme = resolvedTheme;
        applied.current = resolvedTheme;
        if (still) {
            void root.offsetHeight;
            requestAnimationFrame(() => still.remove());
        }
    }, [resolvedTheme]);

    return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const value = useContext(ThemeContext);
    if (!value) throw new Error("useTheme needs the ThemeProvider from the root layout.");
    return value;
}
