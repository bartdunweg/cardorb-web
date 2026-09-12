"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { SearchLg, XClose } from "@untitledui/icons";
import { RowButton } from "@/components/app/row-button";
import { cx } from "@/utils/cx";

// The search field of a list row, and how it sits there. From sm it is the field, 208 px at most,
// so the buttons beside it have room to breathe. On a phone the field was most of the row, so it
// is a round search button like the three beside it (Alta's closet does the same); a press opens
// the field across the whole row and the buttons step aside until the round close button beside
// it (the Claude app's search) empties it and puts them back. A field with a term in it stays open,
// or the list would be narrowed with nothing on screen saying by what.
// The buttons are hidden by the row's own CSS (`LIST_ROW`), so no page has to pass state up to hide
// its own buttons: a binder's row puts its View button outside the box the field is in.

/**
 * A list row: the search, then Filters, Sort and View. One class for every page that has one, so the
 * gaps match, and on a phone an open search hides every button in the row but its own, and the box a
 * button comes in, which would otherwise keep its gap at the end of the row.
 */
export const LIST_ROW =
    "flex flex-wrap items-center gap-2 max-sm:has-[[data-row-search][data-open]]:[&_:is(button,div:has(>button)):not([data-row-search],[data-row-search]_*,:has([data-row-search]))]:hidden";

export function RowSearch({
    label,
    filled,
    onClear,
    disabled = false,
    children,
}: {
    /** The field's own name, also the name of the button that opens it. */
    label: string;
    /** Whether the field holds a term: it stays open while it does. */
    filled: boolean;
    /** Empties the field, for the close button. */
    onClear: () => void;
    disabled?: boolean;
    /** The field itself, which takes the room it is given. */
    children: ReactNode;
}) {
    const [expanded, setExpanded] = useState(false);
    const open = expanded || filled;
    const root = useRef<HTMLDivElement>(null);
    /** Where focus goes once the row has redrawn: into the field just opened, or back to the button that opened it. */
    const focusTo = useRef<"field" | "button" | null>(null);

    useEffect(() => {
        if (!focusTo.current) return;
        const target = focusTo.current === "field" ? root.current?.querySelector("input") : root.current?.querySelector<HTMLElement>("[data-row-search-open]");
        target?.focus();
        focusTo.current = null;
    }, [open]);

    return (
        <div
            ref={root}
            data-row-search
            data-open={open ? true : undefined}
            className={cx(
                "flex min-w-0 items-center gap-2 sm:max-w-52 sm:flex-1",
                // The phone's open field: the whole row.
                open && "max-sm:flex-1",
            )}
        >
            {open ? null : (
                <RowButton
                    data-row-search-open
                    icon={SearchLg}
                    label={label}
                    isDisabled={disabled}
                    className="sm:hidden"
                    onClick={() => {
                        setExpanded(true);
                        focusTo.current = "field";
                    }}
                />
            )}
            <div className={cx("min-w-0 flex-1", !open && "max-sm:hidden")}>{children}</div>
            {open ? (
                <RowButton
                    icon={XClose}
                    label="Close search"
                    className="sm:hidden"
                    onClick={() => {
                        onClear();
                        setExpanded(false);
                        focusTo.current = "button";
                    }}
                />
            ) : null}
        </div>
    );
}
