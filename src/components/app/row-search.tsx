"use client";

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { closeRowSearch, useRowSearch } from "@/hooks/use-row-search";
import { cx } from "@/utils/cx";

// The search field of a list row, and how it sits there. From sm it is the field, 208 px at most,
// so the buttons beside it have room to breathe. On a phone, on a page with no bar (Browse, a
// public profile), it takes the whole first line with the row's buttons under it; on a page with a
// bar it is a button there (`BarSearchButton`), and a press turns the bar into the field with
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
export const FILTER_BAR = "scrollbar-hide flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto sm:contents";

// The bar's slot is drawn with the page and never moves, so there is nothing to subscribe to.
const noChange = () => () => {};
const findSlot = () => document.querySelector<HTMLElement>("[data-bar-search]");
const noSlot = () => null;

const FIELD = "flex min-w-0 items-center [&_input]:text-ellipsis max-sm:[&_input]:h-11";

/**
 * `collapsible`: the page has a bar, and on a phone the field lives in it: out on the bar's search
 * press, or while it holds a term, so a narrowed list always says why. `onClear` empties the term,
 * for Cancel, which also puts the bar back.
 */
export function RowSearch({
    children,
    collapsible = false,
    filled = false,
    onClear,
}: {
    children: ReactNode;
    collapsible?: boolean;
    filled?: boolean;
    onClear?: () => void;
}) {
    const page = usePathname();
    const { open, asked } = useRowSearch(page);
    const sm = useBreakpoint("sm");
    /* The bar is only found in the browser, and the server draws the row as from sm: the field moves
       into the bar once the page is up, not while React takes over the server's drawing. */
    const slot = useSyncExternalStore(noChange, findSlot, noSlot);
    const inBar = collapsible && !sm && slot !== null;

    const field = useRef<HTMLDivElement>(null);
    // The bar's press asks for the caret: the field has just come out, or was out and is asked for again.
    const seen = useRef(asked);
    useEffect(() => {
        if (asked === seen.current) return;
        seen.current = asked;
        if (open) field.current?.querySelector("input")?.focus();
    }, [asked, open, inBar]);

    if (inBar) {
        if (!open && !filled) return null;
        return createPortal(
            <>
                <div ref={field} className={cx(FIELD, "flex-1")}>
                    {children}
                </div>
                <Button
                    color="link-gray"
                    size="sm"
                    className="hit-area shrink-0"
                    onClick={() => {
                        onClear?.();
                        closeRowSearch();
                        // Back to the button that opened it, now that the bar is back.
                        requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-bar-search-button]")?.focus());
                    }}
                >
                    Cancel
                </Button>
            </>,
            slot,
        );
    }

    return (
        <div ref={field} className={cx(FIELD, "basis-full sm:max-w-52 sm:flex-1 sm:basis-auto", collapsible && !filled && "max-sm:hidden")}>
            {children}
        </div>
    );
}
