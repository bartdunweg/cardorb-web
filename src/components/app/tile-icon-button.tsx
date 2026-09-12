"use client";

import type { ComponentProps, FC } from "react";
import { Button as AriaButton } from "react-aria-components";
import { cx } from "@/utils/cx";

/**
 * Ours: the round button under a card tile, in the row under the price. A set's tile carries a
 * heart and a plus there, a wishlist tile a check, and every one of them is this one size in this
 * one place, so a grid reads the same whichever list it is.
 *
 * Not the kit's ButtonUtility: that is a square toolbar control, and these sit under a card's
 * rounded corners in a grid of a hundred. A react-aria button, so it can be a dialog's or a
 * menu's trigger as well as a button of its own.
 *
 * size-7, not size-6: 24px clears WCAG 2.5.8's minimum by nothing at all, and this is a thumb
 * target on a phone. The label is the whole name: the icon says nothing to a screen reader.
 */
export function TileIconButton({
    icon: Icon,
    label,
    pending = false,
    ...props
}: Omit<ComponentProps<typeof AriaButton>, "className" | "children" | "aria-label"> & {
    icon: FC<{ className?: string; "aria-hidden"?: boolean | "true" }>;
    /** What it does and to which card: "Add Pikachu #25 to your collection". */
    label: string;
    pending?: boolean;
}) {
    return (
        <AriaButton
            {...props}
            isDisabled={pending || props.isDisabled}
            aria-label={label}
            className={({ isFocusVisible, isHovered }) =>
                cx(
                    "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary ring-1 ring-primary outline-offset-2 outline-focus-ring ring-inset",
                    isHovered && "bg-primary_hover",
                    isFocusVisible && "outline-2",
                    pending && "cursor-progress opacity-50",
                )
            }
        >
            <Icon className="size-3.5" aria-hidden="true" />
        </AriaButton>
    );
}
