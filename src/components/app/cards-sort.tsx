"use client";

import { usePathname, useRouter } from "next/navigation";
import { NativeSelect } from "@/components/base/select/select-native";
import { type ListQuery, SORT_OPTIONS, type SortOption, listHref } from "@/lib/list-query";
import { cx } from "@/utils/cx";

// The sort menu of a card list. A choice goes into the URL (page back to one), and the server
// page re-asks the API in that order; nothing is sorted in the browser. A public list hands in
// the shorter option list it can offer.
export function CardsSort({ query, options = SORT_OPTIONS, className }: { query: ListQuery; options?: readonly SortOption[]; className?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <NativeSelect
            aria-label="Sort"
            size="sm"
            className={cx("w-auto", className)}
            value={query.sortKey}
            onChange={(event) => {
                const sortKey = options.find((o) => o.value === event.target.value)?.value ?? "set";
                router.replace(listHref(pathname, query, { sortKey, page: 1 }), { scroll: false });
            }}
            options={options.map((o) => ({ label: o.label, value: o.value }))}
        />
    );
}
