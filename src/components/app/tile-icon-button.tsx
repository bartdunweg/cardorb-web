"use client";

import type { FC } from "react";
import { Button } from "@/components/base/buttons/button";

/**
 * Ours, on the kit's button: the round button under a card tile, in the row under the price. A
 * set's tile carries a heart and a plus there, a wishlist tile a check, and every one of them is
 * this one size in this one place, so a grid reads the same whichever list it is.
 *
 * The kit's smallest icon-only button, secondary and a pill: 32 by 32, the size of every other
 * icon button in the app. It was a hand-built 28, the one control of its kind that size. The
 * kit's button is a react-aria button, so it can be a dialog's or a menu's trigger as well.
 *
 * The label is the whole name: the icon says nothing to a screen reader.
 */
export function TileIconButton({
    icon,
    label,
    pending = false,
    onPress,
}: {
    icon: FC<{ className?: string }>;
    /** What it does and to which card: "Add Pikachu #25 to your collection". */
    label: string;
    pending?: boolean;
    onPress?: () => void;
}) {
    return <Button size="xs" color="secondary" iconLeading={icon} aria-label={label} isDisabled={pending} onClick={onPress} />;
}
