"use client";

import { SearchLg } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { cx } from "@/utils/cx";

/**
 * Ours: a button dressed as the search field, for the palette's trigger in the desktop sidebar,
 * which opens a search instead of taking one. The kit's Input is a field, and a field that answers
 * a tap by opening a dialog is a lie to anything that reads it; this is a button that wears the
 * field's ring, radius and icon. On a phone the palette opens from the round button beside the tab
 * bar (mobile-nav.tsx).
 */
export function SearchTrigger({
    label,
    onPress,
    className,
}: {
    /** The words in the bar, and the button's name: "Search". */
    label: string;
    onPress: () => void;
    className?: string;
}) {
    return (
        <AriaButton
            onPress={onPress}
            className={cx(
                "flex w-full pressable cursor-pointer items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm text-tertiary ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2",
                className,
            )}
        >
            <SearchLg className="size-5 text-fg-quaternary" />
            <span className="flex-1 text-left">{label}</span>
        </AriaButton>
    );
}
