"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { closeRowSearch, useBarSearchSlot, useRowSearch } from "@/hooks/use-row-search";
import { cx } from "@/utils/cx";

// The search field of a list row, and how it sits there. From sm it is the field, 208 px at most,
// so the buttons beside it have room to breathe. On a phone, on a page with no bar (a public
// profile), it takes the whole first line with the row's buttons under it; on a page with a bar
// (a binder, a set, Browse) it is a button there (`BarSearchButton`), and a press turns the bar into the field with
// Cancel beside it, the way Gojek and Keeta search a list (Mobbin, 2026-09-19). 44 px high on a
// phone, as the buttons around it; 36 from sm. A long list name ends in an ellipsis in the 208 px
// field rather than being cut mid-letter.

/** A list row: the search, then Filters, Sort and View. One class for every page that has one, so the gaps match. */
export const LIST_ROW = "flex flex-wrap items-center gap-2";

/**
 * On a phone the line under the search: Filters and Sort, then each filter as a button of its own,
 * one line that scrolls sideways (Temu, Tabby and Walmart on Mobbin), sharing its line with View
 * only on a page with no bar to put View in. From sm the box goes (`contents`) and its buttons
 * stand in the row as before.
 */
// The 4 px around the line is room for a button's focus ring, which a box that scrolls one way clips both ways; the margin takes it back.
export const FILTER_BAR = "scrollbar-hide -m-1 flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto p-1 sm:contents";

const FIELD = "flex min-w-0 items-center [&_input]:text-ellipsis max-sm:[&_input]:h-11";

/**
 * Where the field is on a phone. "row": its own line in the row (a public profile, which has no bar).
 * "button": in the bar, out on the bar's search press (`BarSearchButton`) or while it holds a term,
 * so a narrowed list always says why; Cancel empties it and puts the bar back (a binder, a set).
 * "bar": always in the bar, in the title's place, on a page the tab bar reaches (My cards, Browse);
 * Cancel shows while it holds a term. `onClear` empties the term.
 */
export type SearchPlace = "row" | "button" | "bar";

export function RowSearch({
    children,
    place = "row",
    filled = false,
    onClear,
}: {
    children: ReactNode;
    place?: SearchPlace;
    filled?: boolean;
    onClear?: () => void;
}) {
    const page = usePathname();
    const { open, asked } = useRowSearch(page);
    const sm = useBreakpoint("sm");
    /* The bar is only found in the browser, and the server draws the row as from sm: the field moves
       into the bar once the page is up, not while React takes over the server's drawing. */
    const slot = useBarSearchSlot();
    // Only a field that can be emptied goes into the bar: the loading row's stand-in has nothing for Cancel to do.
    const inBar = place !== "row" && onClear !== undefined && !sm && slot !== null;
    // Leaving the page puts its search away: coming back opens the bar as a bar, unless a term is in force.
    useEffect(() => () => closeRowSearch(), []);

    const field = useRef<HTMLDivElement>(null);
    // The bar's press asks for the caret: the field has just come out, or was out and is asked for again.
    const seen = useRef(asked);
    useEffect(() => {
        if (asked === seen.current) return;
        seen.current = asked;
        if (open) field.current?.querySelector("input")?.focus();
    }, [asked, open, inBar]);

    if (inBar && place === "bar") {
        return createPortal(
            <>
                <div ref={field} className={cx(FIELD, "flex-1")}>
                    {children}
                </div>
                {filled ? (
                    <Button
                        color="link-gray"
                        size="sm"
                        className="hit-area shrink-0"
                        onClick={() => {
                            onClear?.();
                            field.current?.querySelector("input")?.focus();
                        }}
                    >
                        Cancel
                    </Button>
                ) : null}
            </>,
            slot,
        );
    }

    if (inBar) {
        if (!open && !filled) return null;
        const putAway = () => {
            closeRowSearch();
            // Back to the button that opened it, now that the bar is back.
            requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-bar-search-button]")?.focus());
        };
        // Escape in an empty field puts the bar back, as Cancel does; with a term, the field's own Escape empties it first.
        const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Escape" && event.target instanceof HTMLInputElement && event.target.value === "") putAway();
        };
        return createPortal(
            <>
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a key listener on the box, for the field inside it; the box itself is not a control. */}
                <div ref={field} className={cx(FIELD, "flex-1")} onKeyDown={onKeyDown}>
                    {children}
                </div>
                <Button
                    color="link-gray"
                    size="sm"
                    className="hit-area shrink-0"
                    onClick={() => {
                        onClear?.();
                        putAway();
                    }}
                >
                    Cancel
                </Button>
            </>,
            slot,
        );
    }

    return (
        <div ref={field} className={cx(FIELD, "basis-full sm:max-w-52 sm:flex-1 sm:basis-auto", place !== "row" && !filled && "max-sm:hidden")}>
            {children}
        </div>
    );
}
