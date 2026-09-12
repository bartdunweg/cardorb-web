"use client";

import type { FC } from "react";
import { Button, styles } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * Ours, on the kit's button: the round button under a card tile, in the row under the price. A
 * set's tile carries a heart and a plus there, a wishlist tile a check, and every one of them is
 * this one size in this one place, so a grid reads the same whichever list it is.
 *
 * The kit's smallest icon-only button, secondary and a pill: 32 by 32, the size of every other
 * icon button in the app. It was a hand-built 28, the one control of its kind that size. The
 * kit's button is a react-aria button, so it can be a dialog's or a menu's trigger as well.
 *
 * `on` is a mark that is set, a card on the wishlist or among the favourites: the button takes the
 * mark's own colour and the icon is filled (see `MARK_ON`). Pressed state is said with
 * `aria-pressed` too, so the colour is never the only thing that says it.
 *
 * The label is the whole name: the icon says nothing to a screen reader.
 */
export function TileIconButton({
    icon,
    label,
    pending = false,
    on,
    onPress,
}: {
    icon: FC<{ className?: string; "data-icon"?: string }>;
    /** What it does and to which card: "Add Pikachu #25 to your collection". */
    label: string;
    pending?: boolean;
    /** The mark this button sets, when it is set. */
    on?: Mark;
    onPress?: () => void;
}) {
    const Icon = icon;
    return (
        <Button
            size="xs"
            color="secondary"
            iconLeading={on ? <Icon data-icon="leading" className={cx(styles.common.icon, "fill-current")} /> : icon}
            aria-label={label}
            aria-pressed={on ? true : undefined}
            isDisabled={pending}
            onClick={onPress}
            className={on ? MARK_ON[on] : undefined}
        />
    );
}

export type Mark = "wishlist" | "favorite";

/**
 * A set mark, in its own colour: pink for the wishlist, yellow for a favourite. Bart's call,
 * 2026-09-13: a white button with a filled icon did not read as "this is on" in dark mode, where
 * every button beside it is dark and the white one looked like the primary action. The fill is
 * what the icon says; the colour is what a glance across a grid says.
 *
 * The icon owes 3:1 against the button (WCAG 1.4.11). The raw scale, not the utility tokens: those
 * turn yellow to ochre in dark mode, and the point is the same yellow on both grounds. White on
 * pink-500 is 3.5:1; yellow carries a black icon, since white on yellow is 1.7:1. The ring goes,
 * because a coloured disc needs no outline to be seen.
 */
export const MARK_ON: Record<Mark, string> = {
    wishlist: "bg-pink-500 text-white ring-transparent hover:bg-pink-600 hover:text-white",
    favorite: "bg-yellow-400 text-black ring-transparent hover:bg-yellow-300 hover:text-black",
};
