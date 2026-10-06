"use client";

import type { SVGProps } from "react";
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
 * The appearance mark iOS uses: a circle, its left half filled. Drawn as the kit's line icons are
 * (24 grid, 2 px stroke, currentColor): the kit's Contrast02 outlines its half, iOS fills it.
 */
function CircleHalfFilled(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
        </svg>
    );
}

/**
 * Ours, from the kit's ButtonUtility at its smallest: one icon, the half-filled circle iOS shows
 * for appearance (the owner's call, 2026-10-05; a moon or a sun before it, and three choices before
 * that, too big for the landing page's footer). A tap sets the other theme outright; the tooltip
 * says which.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    const toDark = resolvedTheme !== "dark";
    return (
        <ButtonUtility
            size="xs"
            color="tertiary"
            icon={CircleHalfFilled}
            tooltip={toDark ? "Switch to dark mode" : "Switch to light mode"}
            onClick={() => setTheme(toDark ? "dark" : "light")}
            // A step darker than the kit's fg-quaternary (2.6:1 on white): alone, the icon carries the meaning and needs 3:1.
            className={cx("text-fg-tertiary hover:text-fg-tertiary_hover", className)}
        />
    );
}
