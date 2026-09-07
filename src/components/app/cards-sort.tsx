"use client";

import { SwitchVertical01 } from "@untitledui/icons";
import { usePathname, useRouter } from "next/navigation";
import { RowButton } from "@/components/app/row-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { type ListQuery, SORT_OPTIONS, type SortKey, type SortOption, listHref } from "@/lib/list-query";

// The sort of a card list, a menu button beside Filters and View. A choice goes into the URL
// (page back to one), and the server page re-asks the API in that order; nothing is sorted in
// the browser. A public list hands in the shorter option list it can offer.
export function CardsSort({
    query,
    options = SORT_OPTIONS,
    defaultSortKey = "set",
}: {
    query: ListQuery;
    options?: readonly SortOption[];
    /** What a bare URL means on this page; the others are written into it. */
    defaultSortKey?: SortKey;
}) {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <Dropdown.Root>
            <RowButton icon={SwitchVertical01} label="Sort" menu />
            <Dropdown.Popover placement="bottom start" className="w-56">
                <Dropdown.Menu
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={new Set([query.sortKey])}
                    onSelectionChange={(keys) => {
                        const key = keys === "all" ? undefined : [...keys][0];
                        const sortKey = options.find((o) => o.value === key)?.value ?? defaultSortKey;
                        router.replace(listHref(pathname, query, { sortKey, page: 1 }, defaultSortKey), { scroll: false });
                    }}
                >
                    {options.map((o) => (
                        <Dropdown.Item key={o.value} id={o.value}>
                            {o.label}
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
