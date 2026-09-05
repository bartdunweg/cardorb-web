"use client";

import { ChevronDown, SwitchVertical01 } from "@untitledui/icons";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { type ListQuery, SORT_OPTIONS, type SortOption, listHref } from "@/lib/list-query";

// The sort of a card list, a menu button beside Filters and View. A choice goes into the URL
// (page back to one), and the server page re-asks the API in that order; nothing is sorted in
// the browser. A public list hands in the shorter option list it can offer.
export function CardsSort({ query, options = SORT_OPTIONS }: { query: ListQuery; options?: readonly SortOption[] }) {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <Dropdown.Root>
            <Button color="secondary" size="sm" iconLeading={SwitchVertical01} iconTrailing={ChevronDown}>
                Sort
            </Button>
            <Dropdown.Popover placement="bottom start" className="w-56">
                <Dropdown.Menu
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={new Set([query.sortKey])}
                    onSelectionChange={(keys) => {
                        const key = keys === "all" ? undefined : [...keys][0];
                        const sortKey = options.find((o) => o.value === key)?.value ?? "set";
                        router.replace(listHref(pathname, query, { sortKey, page: 1 }), { scroll: false });
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
