import type { BadgeColors } from "@/components/base/badges/badge-types";
import { Badge } from "@/components/base/badges/badges";

// A copy's condition as a badge in Cardmarket's scale and roughly its colours: Mint a cool blue,
// Near Mint green, then warmer down to Poor in red, so a glance says how far from mint it is.
// The kit's badge colours, lightest kind, so it reads the same in both themes. A condition
// outside the scale (the field is free text) is shown as it was written, in grey.
const SCALE: { keys: string[]; label: string; color: BadgeColors }[] = [
    { keys: ["mint", "mt"], label: "Mint", color: "sky" },
    { keys: ["near mint", "nm", "near-mint"], label: "Near Mint", color: "success" },
    { keys: ["excellent", "ex"], label: "Excellent", color: "blue" },
    { keys: ["good", "gd"], label: "Good", color: "warning" },
    { keys: ["light played", "lightly played", "lp"], label: "Light Played", color: "orange" },
    { keys: ["played", "pl"], label: "Played", color: "orange" },
    { keys: ["poor", "po"], label: "Poor", color: "error" },
];

/** The scale, top down, for a picker. */
export const CONDITIONS = SCALE.map((c) => c.label);

export function conditionOf(raw: string): { label: string; color: BadgeColors } {
    const key = raw.trim().toLowerCase();
    return SCALE.find((c) => c.keys.includes(key)) ?? { label: raw, color: "gray" };
}

export function ConditionBadge({ condition }: { condition: string }) {
    const { label, color } = conditionOf(condition);
    return (
        <Badge size="sm" color={color} type="pill-color">
            {label}
        </Badge>
    );
}
