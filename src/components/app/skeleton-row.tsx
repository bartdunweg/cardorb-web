"use client";

import { ChevronDown, FilterLines, Grid01, SearchLg, SwitchVertical01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

/** The list row as the page draws it, before it can do anything: the search field and the three buttons, disabled. */
export function ListRow() {
    return (
        <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
            <Input
                aria-label="Search"
                icon={SearchLg}
                placeholder="Search your collection"
                size="sm"
                isDisabled
                className="min-w-0 flex-1 sm:max-w-80"
                wrapperClassName="rounded-full"
            />
            <Button color="secondary" size="sm" iconLeading={FilterLines} isDisabled>
                <span className="max-sm:sr-only">Filters</span>
            </Button>
            <Button color="secondary" size="sm" iconLeading={SwitchVertical01} iconTrailing={ChevronDown} isDisabled>
                <span className="max-sm:sr-only">Sort</span>
            </Button>
            <Button color="secondary" size="sm" iconLeading={Grid01} iconTrailing={ChevronDown} isDisabled className="ml-auto">
                <span className="max-sm:sr-only">View</span>
            </Button>
        </div>
    );
}
