"use client";

import { useCallback, useTransition } from "react";
import { Grid01, Rows01, SwitchVertical01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { countShelf } from "@/app/(app)/dashboard/sets/actions";
import { CardsSearch } from "@/components/app/cards-search";
import { type FilterAnswer, type FilterValues, FiltersSheet } from "@/components/app/filters-sheet";
import { FlagIcon } from "@/components/app/flag-icon";
import { RowButton } from "@/components/app/row-button";
import { LIST_ROW } from "@/components/app/row-search";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Dot } from "@/components/foundations/dot-icon";
import { BROWSE_PROGRESS_OPTIONS, BROWSE_SORT_OPTIONS, type BrowseQuery, browseHref, isBrowseProgress, isBrowseSort } from "@/lib/browse-query";
import { BROWSE_LANGUAGES, isBrowseLanguage } from "@/lib/languages";
import { SETS_VIEW_COOKIE, type SetsViewMode } from "@/lib/sets-view";
import { cx } from "@/utils/cx";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** A set's progress as a dot of colour beside its word, the way a status tag reads: done, under way, untouched. */
const PROGRESS_DOT: Record<string, string> = {
    started: "text-fg-warning-secondary",
    complete: "text-fg-success-secondary",
    new: "text-fg-quaternary",
};

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

/**
 * Ours: the row over the Browse shelf, as a binder's: the search field, then Filters, Sort and
 * View. Search narrows the shelf to sets by name; Filters holds the catalogue's language (with its flag) and how far
 * along a set is (as status tags), tags in the sheet on a phone and menus in the row itself from lg; Sort turns the shelf;
 * View draws it as tiles or rows. Search, language, progress and sort go into the URL (`?q=`,
 * `?language=`, `?progress=`, `?sort=`), so the page
 * can be shared and comes back the same; the view is a cookie the server reads, so the chosen
 * layout is in the first paint. The shelf under the row re-reads on each.
 */
export function BrowseToolbar({ query, view }: { query: BrowseQuery; view: SetsViewMode }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    // Per choice, the sets it would leave (the search as typed); the button's total with it.
    const count = useCallback(
        async (v: FilterValues): Promise<FilterAnswer> => {
            const answer = await countShelf({ language: v.language?.[0] ?? "en", progress: v.progress?.[0] ?? "all", q: query.q });
            return { total: answer.total, options: { progress: answer.progress, ...(answer.language ? { language: answer.language } : {}) } };
        },
        [query.q],
    );
    const go = (patch: Partial<BrowseQuery>) => startTransition(() => router.replace(browseHref(query, patch), { scroll: false }));

    return (
        <div className={cx(LIST_ROW, "transition-opacity", pending && "opacity-60")}>
            {/* A round button on a phone, a short field from sm (`RowSearch`), as in a binder's row. */}
            {/* The shelf it filters is the shelf it offers: its set names, in the language chosen. */}
            <CardsSearch size="sm" initialValue={query.q ?? ""} label="Search sets" placeholder="Search sets" shelf={query.language} />
            <FiltersSheet
                inline
                noun={["set", "sets"]}
                groups={[
                    {
                        id: "language",
                        label: "Language",
                        all: { value: "en", label: "English", icon: <FlagIcon language="en" labelled /> },
                        options: BROWSE_LANGUAGES.filter((l) => l.code !== "en").map((l) => ({
                            value: l.code,
                            label: l.label,
                            icon: <FlagIcon language={l.code} labelled />,
                        })),
                    },
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
                values={{ language: query.language === "en" ? [] : [query.language], progress: query.progress === "all" ? [] : [query.progress] }}
                count={count}
                onApply={(next) => {
                    const language = next.language?.[0];
                    const progress = next.progress?.[0];
                    go({ language: isBrowseLanguage(language) ? language : "en", progress: isBrowseProgress(progress) ? progress : "all" });
                }}
            />
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
