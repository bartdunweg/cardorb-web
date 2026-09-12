"use client";

import { useTransition } from "react";
import { Grid01, Rows01, SwitchVertical01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { CardsSearch } from "@/components/app/cards-search";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { RowButton } from "@/components/app/row-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { NativeSelect } from "@/components/base/select/select-native";
import { BROWSE_PROGRESS_OPTIONS, BROWSE_SORT_OPTIONS, type BrowseQuery, browseHref, isBrowseProgress, isBrowseSort } from "@/lib/browse-query";
import { BROWSE_LANGUAGES, isBrowseLanguage } from "@/lib/languages";
import { SETS_VIEW_COOKIE, type SetsViewMode } from "@/lib/sets-view";
import { cx } from "@/utils/cx";

const ONE_YEAR = 60 * 60 * 24 * 365;

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

/**
 * Ours: the row over the Browse shelf, as a binder's: the search field, then Filters, Sort and
 * View. Search narrows the shelf to sets by name; Filters holds the catalogue's language and how far
 * along a set is, menus in the sheet on a phone and in the row itself from lg; Sort turns the shelf;
 * View draws it as tiles or rows. Search, language, progress and sort go into the URL (`?q=`,
 * `?language=`, `?progress=`, `?sort=`), so the page
 * can be shared and comes back the same; the view is a cookie the server reads, so the chosen
 * layout is in the first paint. The shelf under the row re-reads on each.
 */
export function BrowseToolbar({ query, view }: { query: BrowseQuery; view: SetsViewMode }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const go = (patch: Partial<BrowseQuery>) => startTransition(() => router.replace(browseHref(query, patch), { scroll: false }));

    return (
        <div className={cx("flex items-center gap-2 transition-opacity", pending && "opacity-60")}>
            {/* The field takes what the buttons leave, so the row is one line at every width. */}
            {/* The shelf it filters is the shelf it offers: its set names, in the language chosen. */}
            <CardsSearch
                size="sm"
                initialValue={query.q ?? ""}
                label="Search sets"
                placeholder="Search sets"
                className="min-w-0 flex-1 sm:max-w-64"
                shelf={query.language}
            />
            <FiltersSheet inline active={[query.language !== "en", query.progress !== "all"].filter(Boolean).length}>
                {/* English is the default and reads as the first row, as "All sets" does in a binder's sheet. */}
                <NativeSelect
                    aria-label="Language"
                    size="sm"
                    className="w-auto"
                    value={query.language}
                    onChange={(event) => go({ language: isBrowseLanguage(event.target.value) ? event.target.value : "en" })}
                    options={BROWSE_LANGUAGES.map((l) => ({ label: l.label, value: l.code }))}
                />
                <NativeSelect
                    aria-label="Progress"
                    size="sm"
                    className="w-auto"
                    value={query.progress}
                    onChange={(event) => go({ progress: isBrowseProgress(event.target.value) ? event.target.value : "all" })}
                    options={[...BROWSE_PROGRESS_OPTIONS]}
                />
            </FiltersSheet>
            <Dropdown.Root>
                <RowButton icon={SwitchVertical01} label="Sort" menu />
                <Dropdown.Popover placement="bottom start" className="w-48">
                    <Dropdown.Menu
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([query.sort])}
                        onSelectionChange={(keys) => {
                            const key = first(keys);
                            go({ sort: isBrowseSort(key) ? key : "newest" });
                        }}
                    >
                        {BROWSE_SORT_OPTIONS.map((o) => (
                            <Dropdown.Item key={o.value} id={o.value}>
                                {o.label}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            <Dropdown.Root>
                <RowButton icon={view === "grid" ? Grid01 : Rows01} label="View" menu className="ml-auto" />
                <Dropdown.Popover placement="bottom end" className="w-40">
                    <Dropdown.Menu
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([view])}
                        onSelectionChange={(keys) => {
                            const key = first(keys);
                            if (key !== "grid" && key !== "list") return;
                            document.cookie = `${SETS_VIEW_COOKIE}=${key}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
                            startTransition(() => router.refresh());
                        }}
                    >
                        <Dropdown.Item id="grid" icon={Grid01}>
                            Grid
                        </Dropdown.Item>
                        <Dropdown.Item id="list" icon={Rows01}>
                            List
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
        </div>
    );
}
