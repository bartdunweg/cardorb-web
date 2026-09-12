"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { SearchLg, XClose } from "@untitledui/icons";
import { RowButton } from "@/components/app/row-button";
import { cx } from "@/utils/cx";

// The search field of a list row, and how it sits there. From sm it is the field, 208 px at most,
// so the buttons beside it have room to breathe. On a phone the field was most of the row, so it
// is a round search button like the three beside it (Alta's closet does the same); a press opens
// the field across the whole row and the buttons step aside until the round close button beside
// it (the Claude app's search) puts them back. Closing keeps the term: emptying it there meant a
// search could not be combined with a change of filter on a phone (Bart's call, 2026-09-13). A term
// still in force puts a dot on the search button, or the list would be narrowed with nothing on
// screen saying so; a page opened with a term starts with the field open, so the term is read.
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
    disabled = false,
    children,
}: {
    /** The field's own name, also the name of the button that opens it. */
    label: string;
    /** Whether the field holds a term: the page opens with the field open, and the closed button carries a dot. */
    filled: boolean;
    disabled?: boolean;
    /** The field itself, which takes the room it is given. */
    children: ReactNode;
}) {
    const [open, setOpen] = useState(filled);
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
                        setOpen(true);
                        focusTo.current = "field";
                    }}
                >
                    {/* In the corner rather than beside the icon, so the button stays the circle its
                        neighbours are. The words are for a screen reader: "Search your cards, on". */}
                    {filled ? (
                        <>
                            <span aria-hidden="true" className="absolute top-1 right-1 size-2 rounded-full bg-brand-solid" />
                            <span className="sr-only">, on</span>
                        </>
                    ) : null}
                </RowButton>
            )}
            <div className={cx("min-w-0 flex-1", !open && "max-sm:hidden")}>{children}</div>
            {open ? (
                <RowButton
                    icon={XClose}
                    label="Close search"
                    className="sm:hidden"
                    onClick={() => {
                        setOpen(false);
                        focusTo.current = "button";
                    }}
                />
            ) : null}
        </div>
    );
}
