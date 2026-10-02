"use client";

import { Monitor04, Moon01, Sun } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { type Theme, isTheme } from "@/lib/theme-script";
import { useTheme } from "@/providers/theme";
import { cx } from "@/utils/cx";

const CHOICES: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon01 },
    { id: "system", label: "System", icon: Monitor04 },
];

/**
 * Ours, from the kit's ButtonGroup: light, dark or follow the system, one tap each, in Settings.
 * The theme is undefined on the server and the first client render, so "system" shows until then.
 */
export function ThemeSwitch({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    return (
        <ButtonGroup
            aria-label="Theme"
            className={className}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={new Set([theme ?? "system"])}
            onSelectionChange={(keys) => {
                const key = [...keys][0];
                if (isTheme(key)) setTheme(key);
            }}
        >
            {CHOICES.map((choice) => (
                <ButtonGroupItem key={choice.id} id={choice.id} iconLeading={choice.icon}>
                    {choice.label}
                </ButtonGroupItem>
            ))}
        </ButtonGroup>
    );
}

/**
 * Ours, from the kit's ButtonUtility at its smallest: one icon that shows where a tap goes, a moon
 * on light and a sun on dark, as a theme toggle is read everywhere (the owner's call, 2026-10-02:
 * three choices were too big for the landing page's footer). A tap sets that theme outright.
 * Until the theme resolves after hydration it shows the moon, the same on server and client.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    const toDark = resolvedTheme !== "dark";
    return (
        <ButtonUtility
            size="xs"
            color="tertiary"
            icon={toDark ? Moon01 : Sun}
            tooltip={toDark ? "Switch to dark mode" : "Switch to light mode"}
            onClick={() => setTheme(toDark ? "dark" : "light")}
            // A step darker than the kit's fg-quaternary (2.6:1 on white): alone, the icon carries the meaning and needs 3:1.
            className={cx("text-fg-tertiary hover:text-fg-tertiary_hover", className)}
        />
    );
}
