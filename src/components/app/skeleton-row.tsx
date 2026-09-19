"use client";

import { FilterLines, Grid01, SearchLg, SwitchVertical01 } from "@untitledui/icons";
import { RowButton } from "@/components/app/row-button";
import { FILTER_BAR, LIST_ROW, RowSearch } from "@/components/app/row-search";
import { Input } from "@/components/base/input/input";

/** The list row as the page draws it, before it can do anything: the search field and the three buttons, disabled. */
export function ListRow({ readOnly = false }: { readOnly?: boolean }) {
    return (
        <div className={LIST_ROW} aria-hidden="true">
            {/* On a phone a public profile keeps its search on a line of its own; a page with a bar has it there. */}
            <RowSearch place={readOnly ? "row" : "button"}>
                <Input aria-label="Search" icon={SearchLg} placeholder="Search" size="sm" isDisabled wrapperClassName="rounded-full" />
            </RowSearch>
            {/* In the filter line's box, so they draw at its 40 px on a phone as the real ones do: at 44 the row jumped when the list came. */}
            <div className={FILTER_BAR}>
                <RowButton icon={FilterLines} label="Filters" isDisabled />
                <RowButton icon={SwitchVertical01} label="Sort" isDisabled />
            </div>
            {/* On a phone View is in the bar, as on the page it stands in for; a public profile keeps it in the row. */}
            <RowButton icon={Grid01} label="View" isDisabled className={readOnly ? "ml-auto" : "ml-auto max-sm:hidden"} />
        </div>
    );
}
