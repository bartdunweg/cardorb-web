"use client";

import { Monitor04, Moon01, Sun } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { type Theme, isTheme } from "@/lib/theme-script";
import { useTheme } from "@/providers/theme";

const CHOICES: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon01 },
    { id: "system", label: "System", icon: Monitor04 },
];

/**
 * Ours, from the kit's ButtonGroup: light, dark or follow the system, one tap each. With labels in
 * Settings; as three icons in the landing page's footer, where a visitor sets it before having an
 * account (the owner's call, 2026-10-01). The icons keep their names for a screen reader.
 * The theme is undefined on the server and the first client render, so "system" shows until then.
 */
export function ThemeSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
    const { theme, setTheme } = useTheme();
    return (
        <ButtonGroup
            size={compact ? "sm" : "md"}
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
            {CHOICES.map((choice) =>
                compact ? (
                    <ButtonGroupItem key={choice.id} id={choice.id} iconLeading={choice.icon} aria-label={choice.label} />
                ) : (
                    <ButtonGroupItem key={choice.id} id={choice.id} iconLeading={choice.icon}>
                        {choice.label}
                    </ButtonGroupItem>
                ),
            )}
        </ButtonGroup>
    );
}
