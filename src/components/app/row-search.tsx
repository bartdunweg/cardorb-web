import type { ReactNode } from "react";

// The search field of a list row, and how it sits there. From sm it is the field, 208 px at most,
// so the buttons beside it have room to breathe. On a phone it is always there and takes the whole
// first line, with the row's buttons on the line under it: a search behind a round button was a
// search nobody saw, and a term in force had only a dot to say so (Bart's call, 2026-09-18, which
// replaces the round button of #519).

/** A list row: the search, then Filters, Sort and View. One class for every page that has one, so the gaps match. */
export const LIST_ROW = "flex flex-wrap items-center gap-2";

export function RowSearch({ children }: { children: ReactNode }) {
    return <div className="flex min-w-0 basis-full items-center sm:max-w-52 sm:flex-1 sm:basis-auto">{children}</div>;
}
