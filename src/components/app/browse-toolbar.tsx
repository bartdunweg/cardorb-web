"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { Grid01, Rows01, SwitchVertical01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { CardsSearch } from "@/components/app/cards-search";
import { type FilterAnswer, type FilterValues, FiltersSheet } from "@/components/app/filters-sheet";
import { RowButton } from "@/components/app/row-button";
import { FILTER_BAR, LIST_ROW } from "@/components/app/row-search";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Dot } from "@/components/foundations/dot-icon";
import { useArrived } from "@/hooks/use-arrived";
import { setSetsView, useSetsView } from "@/hooks/use-sets-view";
import {
    BROWSE_PROGRESS_OPTIONS,
    BROWSE_SORT_OPTIONS,
    type BrowseQuery,
    NO_SHELF_FACETS,
    type ShelfFacets,
    browseHref,
    isBrowseProgress,
    isBrowseSort,
} from "@/lib/browse-query";
import { BROWSE_LANGUAGES, isBrowseLanguage } from "@/lib/languages";
import { countShelf } from "@/lib/reads";
import type { SetsViewMode } from "@/lib/sets-view";
import { cx } from "@/utils/cx";

/** A set's progress as a dot of colour beside its word, the way a status tag reads: done, under way, untouched. */
const PROGRESS_DOT: Record<string, string> = {
    started: "text-fg-warning-secondary",
    complete: "text-fg-success-secondary",
    new: "text-fg-quaternary",
};

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

/**
 * Ours: the row over the Browse shelf, as a binder's: the search field, then Filters, Sort and
 * View, and the catalogue's language as tabs under it. Search narrows the shelf to sets by name;
 * Filters holds the series, the release year and how far along a set is, tags in the sheet, a
 * button each on a phone's line and menus in the row itself from lg; Sort turns the shelf; View
 * draws it as tiles or rows. Search, language, series, year, progress and sort go into the URL
 * (`?q=`, `?language=`, `?series=`, `?year=`, `?progress=`, `?sort=`), so the page
 * can be shared and comes back the same; the view is a cookie the server reads, so the chosen
 * layout is in the first paint. The shelf under the row re-reads on each but the view, which only
 * redraws the sets already there.
 */
export function BrowseToolbar({
    query,
    view: initialView,
    facets: facetsOnTheWay,
}: {
    query: BrowseQuery;
    view: SetsViewMode;
    /** The series and years this catalogue's shelf has, or the promise of them: until they are in, the sheet offers what the URL already names. */
    facets: ShelfFacets | PromiseLike<ShelfFacets>;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const arrived = useArrived(facetsOnTheWay, NO_SHELF_FACETS);
    // A choice in the URL stays offered while the shelf is on its way, or when this shelf lacks it.
    const seriesNames = [...new Set([...arrived.series, ...query.series])];
    const yearNames = [...new Set([...arrived.years, ...query.year])];
    // Per choice, the sets it would leave (the search as typed, the other filters as drafted); the button's total with it.
    const count = useCallback(
        async (v: FilterValues): Promise<FilterAnswer> => {
            const answer = await countShelf({
                language: query.language,
                progress: v.progress?.[0] ?? "all",
                q: query.q,
                series: v.series ?? [],
                year: v.year ?? [],
            });
            return { total: answer.total, options: { progress: answer.progress, series: answer.series, year: answer.year } };
        },
        [query.q, query.language],
    );
    // The catalogue tab follows the tap at once and the line slides then, as the set page's and My cards' do;
    // the address and the shelf follow when the page answers.
    const [language, showLanguage] = useOptimistic(query.language);
    const go = (patch: Partial<BrowseQuery>) =>
        startTransition(() => {
            if (patch.language) showLanguage(patch.language);
            // From the catalogue shown: a sort or a filter picked while a switch is on its way keeps it.
            router.replace(browseHref({ ...query, language }, patch), { scroll: false });
        });

    // Sort, twice over: in the row from sm, and on a phone between Filters and the filters (`FiltersSheet`'s lead).
    const sortMenu = (
        <Dropdown.Root>
            <RowButton icon={SwitchVertical01} label="Sort" />
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
    );
    return (
        // The row, then the language as tabs under it, 16 px apart as on My cards.
        <div className="flex flex-col gap-4">
            {/* The row dims while the next answer is fetched, after 150 ms, so a quick answer never flickers;
                it lights up again at once. The tabs under it do not: their line has already moved. */}
            <div className={cx(LIST_ROW, "transition-opacity duration-(--duration-fast) ease-enter", pending && "opacity-60 delay-(--duration-fast)")}>
                {/* In the bar on a phone once its search is pressed, a short field from sm (`RowSearch`), as in a binder's row. */}
                {/* The shelf it filters is the shelf it offers: its set names, in the language chosen. */}
                <CardsSearch size="sm" initialValue={query.q ?? ""} label="Search in Browse" shelf={query.language} place="bar" />
                {/* On a phone the line under the search, scrolling sideways. */}
                <div className={FILTER_BAR}>
                    <FiltersSheet
                        inline
                        lead={sortMenu}
                        noun={["set", "sets"]}
                        groups={[
                            { id: "series", label: "Series", multiple: true, options: seriesNames.map((name) => ({ value: name, label: name })) },
                            { id: "year", label: "Year", multiple: true, options: yearNames.map((y) => ({ value: y, label: y })) },
                            {
                                id: "progress",
                                label: "Progress",
                                all: { value: "all", label: "All sets" },
                                options: BROWSE_PROGRESS_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
                                    value: o.value,
                                    label: o.label,
                                    icon: <Dot size="md" aria-hidden="true" className={PROGRESS_DOT[o.value]} />,
                                })),
                            },
                        ]}
                        values={{ series: query.series, year: query.year, progress: query.progress === "all" ? [] : [query.progress] }}
                        count={count}
                        onApply={(next) => {
                            const progress = next.progress?.[0];
                            go({ series: next.series ?? [], year: next.year ?? [], progress: isBrowseProgress(progress) ? progress : "all" });
                        }}
                    />
                    <div className="contents max-sm:hidden">{sortMenu}</div>
                </div>
                {/* On a phone in the bar beside the search field (`SetsViewMenu` in the page's header). */}
                <SetsViewMenu initialView={initialView} className="max-sm:hidden" />
            </div>
            {/* The catalogue as a switch under the filters, English | Japanese, half the line each, as My cards
            switches Collection | Wishlist (Bart's call, 2026-09-19). Two catalogues are too few to hide in
            the filter sheet, where it was a menu of one choice. */}
            {/* A replace, as Browse's other choices are, not links: the plain address a link to English
                makes is filled back in with the query last kept for Browse (withListQuery), which had
                just become the Japanese one. The series and years belong to one catalogue, so a switch
                leaves them behind. */}
            <Tabs
                selectedKey={language}
                onSelectionChange={(key) => {
                    if (isBrowseLanguage(key) && key !== language) go({ language: key, series: [], year: [] });
                }}
            >
                <TabList aria-label="Catalogue" type="underline" size="sm" fullWidth>
                    {BROWSE_LANGUAGES.map((l) => (
                        <Tab key={l.code} id={l.code} label={l.label} className="flex-1 justify-center py-3" />
                    ))}
                </TabList>
            </Tabs>
        </div>
    );
}

/**
 * The shelf's View: tiles or rows. In the row from sm, and on a phone in the bar beside the search
 * field, as My cards has its View (Bart's call, 2026-09-19). Both read one choice (`useSetsView`).
 */
export function SetsViewMenu({ initialView, className }: { initialView: SetsViewMode; className?: string }) {
    const view = useSetsView(initialView);
    return (
        <Dropdown.Root>
            <RowButton icon={view === "grid" ? Grid01 : Rows01} label="View" className={cx("ml-auto shrink-0", className)} />
            <Dropdown.Popover placement="bottom end" className="w-40">
                <Dropdown.Menu
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={new Set([view])}
                    onSelectionChange={(keys) => {
                        const key = first(keys);
                        if (key !== "grid" && key !== "list") return;
                        // The shelf redraws from the sets it holds; the cookie is for the next load (use-sets-view.ts).
                        setSetsView(key);
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
    );
}
