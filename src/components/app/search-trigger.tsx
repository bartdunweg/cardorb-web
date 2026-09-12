"use client";

import { SearchLg } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { cx } from "@/utils/cx";

/**
 * Ours: a button dressed as the search field, for the two places that open a search instead of
 * taking one — the palette's trigger in the desktop sidebar and the bar at the top of Home on a
 * phone. The kit's Input is a field, and a field that answers a tap by opening a dialog is a lie
 * to anything that reads it; this is a button that wears the field's ring, radius and icon.
 *
 * The two sizes are the two places: `sm` sits in the sidebar, `md` is the phone's bar, which is the
 * kit's Input at its lg size and says a placeholder's sentence, so it carries the placeholder's grey.
 */
export function SearchTrigger({
    label,
    size = "sm",
    shortcut,
    onPress,
    className,
}: {
    /** The words in the bar, and the button's name: "Search", "Search a card or a set". */
    label: string;
    size?: "sm" | "md";
    /** The key that also opens it, drawn at the end of the bar as GitHub and Linear do. Hidden from a screen reader: the button's name is the label. */
    shortcut?: string;
    onPress: () => void;
    className?: string;
}) {
    return (
        <AriaButton
            onPress={onPress}
            className={cx(
                "flex w-full pressable cursor-pointer items-center gap-2 rounded-full bg-primary ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2",
                size === "sm" ? "px-3 py-2 text-sm text-tertiary" : "px-3.5 py-2.5 text-md text-placeholder",
                className,
            )}
        >
            <SearchLg className="size-5 text-fg-quaternary" />
            <span className="flex-1 text-left">{label}</span>
            {shortcut ? (
                <kbd aria-hidden="true" className="rounded-md px-1.5 py-0.5 font-sans text-xs text-quaternary ring-1 ring-secondary ring-inset">
                    {shortcut}
                </kbd>
            ) : null}
        </AriaButton>
    );
}
