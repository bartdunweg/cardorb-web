"use client";

import { SearchLg } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { RowButton } from "@/components/app/row-button";
import { openRowSearch, useRowSearch } from "@/hooks/use-row-search";

/**
 * The search in a phone's bar, beside View and the dots (Bart's call, 2026-09-18): a press turns
 * the bar into the list's field with the caret in it and Cancel beside it (`RowSearch`). While the
 * field holds a term the bar stays that way, so a narrowed list always shows why. From sm the field
 * is in the row and this is not drawn.
 */
export function BarSearchButton({ label }: { label: string }) {
    const page = usePathname();
    const { open } = useRowSearch(page);
    return (
        <RowButton
            icon={SearchLg}
            label={label}
            aria-expanded={open}
            data-bar-search-button
            className="shrink-0 sm:hidden"
            onClick={() => openRowSearch(page)}
        />
    );
}
