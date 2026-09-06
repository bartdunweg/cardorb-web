"use client";

import { FilterLines, Grid01, SearchLg, SwitchVertical01 } from "@untitledui/icons";
import { RowButton } from "@/components/app/row-button";
import { Input } from "@/components/base/input/input";

/** The list row as the page draws it, before it can do anything: the search field and the three buttons, disabled. */
export function ListRow() {
    return (
        <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
            <Input
                aria-label="Search"
                icon={SearchLg}
                placeholder="Search"
                size="sm"
                isDisabled
                className="min-w-0 flex-1 sm:max-w-64"
                wrapperClassName="rounded-full"
            />
            <RowButton icon={FilterLines} label="Filters" isDisabled />
            <RowButton icon={SwitchVertical01} label="Sort" menu isDisabled />
            <RowButton icon={Grid01} label="View" menu isDisabled className="ml-auto" />
        </div>
    );
}
