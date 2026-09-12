"use client";

import { FilterLines, Grid01, SearchLg, SwitchVertical01 } from "@untitledui/icons";
import { RowButton } from "@/components/app/row-button";
import { LIST_ROW, RowSearch } from "@/components/app/row-search";
import { Input } from "@/components/base/input/input";

/** The list row as the page draws it, before it can do anything: the search field and the three buttons, disabled. */
export function ListRow() {
    return (
        <div className={LIST_ROW} aria-hidden="true">
            <RowSearch label="Search" filled={false} onClear={() => {}} disabled>
                <Input aria-label="Search" icon={SearchLg} placeholder="Search" size="sm" isDisabled wrapperClassName="rounded-full" />
            </RowSearch>
            <RowButton icon={FilterLines} label="Filters" isDisabled />
            <RowButton icon={SwitchVertical01} label="Sort" menu isDisabled />
            <RowButton icon={Grid01} label="View" menu isDisabled className="ml-auto" />
        </div>
    );
}
