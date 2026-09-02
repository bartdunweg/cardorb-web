"use client";

import { useSyncExternalStore } from "react";
import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { Button } from "@/components/base/buttons/button";

// Returns false during SSR and the first client render, true thereafter — without a setState
// effect. Used to avoid a hydration mismatch on the theme-dependent icon.
const emptySubscribe = () => () => {};
function useMounted() {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );
}

/** Toggles between light and dark appearance (wired to next-themes). */
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const mounted = useMounted();
    const isDark = resolvedTheme === "dark";

    return (
        <Button
            color="tertiary"
            size="sm"
            iconLeading={mounted ? (isDark ? Sun : Moon01) : undefined}
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
        />
    );
}
