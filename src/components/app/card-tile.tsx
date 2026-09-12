"use client";

import type { ReactNode } from "react";
import { Button as AriaButton } from "react-aria-components";
import { useWarm } from "@/components/app/use-warm";
import { cx } from "@/utils/cx";

/**
 * Ours: a card's picture with its words under it, as one thing you press.
 *
 * The kit has no clickable tile (its cards are containers, not controls), and this shape is drawn
 * in three places: the collection's grid, a Pokédex slot and the row of dearest cards on Home.
 * Written once so a card reads the same wherever it is shown, and so the press, the focus ring and
 * the radius cannot drift apart between them. What goes in the picture box and what the words say
 * is each list's own business; the tile only presses.
 *
 * Without `onSelect` it is the same tile with nothing to press: a Pokédex slot on a public page,
 * where there is nowhere to go.
 */
export function CardTile({
    header,
    picture,
    words,
    onSelect,
    onWarm,
    className,
}: {
    /** A line above the picture, where a list says what the tile stands for before showing it. */
    header?: ReactNode;
    /** The picture in its own box. Nothing of ours frames it: a card carries its own printed border. */
    picture: ReactNode;
    /** The lines under it: the name, and whatever else that list says about the card. */
    words: ReactNode;
    /** Opens the card. Left out where a tile leads nowhere. */
    onSelect?: () => void;
    /** Asks for what opening the card will need, when the pointer rests on the tile or focus lands on it. */
    onWarm?: () => void;
    /** Only what this list changes: the gap and the radius on the row of dearest cards. */
    className?: string;
}) {
    const warm = useWarm(onSelect ? onWarm : undefined);
    if (!onSelect) {
        return (
            <div className={cx("flex flex-col gap-2", className)}>
                {header}
                {picture}
                {words}
            </div>
        );
    }
    return (
        <AriaButton
            onPress={onSelect}
            {...warm}
            // The picture and its words, nothing around them: a card is its own surface, and a tile
            // behind it read as a second one. The focus ring follows the picture's corners.
            className={cx(
                "flex h-full w-full pressable cursor-pointer flex-col gap-2 rounded-lg text-left outline-offset-2 outline-focus-ring focus-visible:outline-2",
                className,
            )}
        >
            {header}
            {picture}
            {words}
        </AriaButton>
    );
}
