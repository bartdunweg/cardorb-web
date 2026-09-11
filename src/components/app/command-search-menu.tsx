"use client";

import { ClockRewind, Trash01 } from "@untitledui/icons";
import { Heading as AriaHeading, ListBoxLoadMoreItem } from "react-aria-components";
import type { CatalogueFilters, PokemonCard } from "@/app/(app)/dashboard/cards/actions";
import { FilterChip, FilterChipRow, type FilterOption } from "@/components/app/filter-chip";
import { LanguageFilterChip } from "@/components/app/language-filter-chip";
import { CommandMenu, type CommandMenuGroupType } from "@/components/application/command-menus/command-menu";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { clearSearches, useRecentSearches } from "@/hooks/use-recent-searches";
import { CARD_TYPES } from "@/lib/card-types";
import { cx } from "@/utils/cx";

/** The id of the row at the end of a full page, the one that asks for the next page. No card carries it. */
const MORE = "more";

/**
 * Focus back to the palette's field. A button that unmounts under the pointer — Try again once
 * hits land — drops focus on the page, and a keyboard user is back at the top of the menu. The
 * kit's menu keeps its field to itself, so it is found from the dialog the pressed button — the
 * active element — sits in.
 */
const focusField = () => document.activeElement?.closest('[role="dialog"]')?.querySelector("input")?.focus();

/** The palette's last recent item: not a term, the way out of the list. */
const CLEAR_RECENT = "recent:clear";

/** The most the API counts: it reads that many and stops, so that figure means "at least". */
const SEARCH_WINDOW = 250;

// The command palette: the search field and the hits; a pressed hit opens the card's sheet over
// it. Loaded by CommandSearchProvider the first time it is opened; the state lives there.
//
// It had a preview beside the list — the catalogue's facts about the highlighted hit and the two
// ways to take it. The sheet says all of that and what the card trades at, which the preview
// could not, so the preview went and pressing a hit opens the sheet (Bart's call, 2026-09-11).
export function CommandSearchMenu({
    isOpen,
    onOpenChange,
    inputValue,
    onInputChange,
    filters,
    onFiltersChange,
    sets,
    hits,
    loading,
    failed,
    onRetry,
    hasMore,
    loadingMore,
    onLoadMore,
    total,
    onOpen,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    inputValue: string;
    onInputChange: (value: string) => void;
    filters: CatalogueFilters;
    onFiltersChange: (next: CatalogueFilters) => void;
    /** Every set the catalogue knows, for the Set chip; empty until the list lands. */
    sets: FilterOption[];
    hits: PokemonCard[];
    loading: boolean;
    /** The API did not answer: not an empty answer, and worth asking again. */
    failed: boolean;
    onRetry: () => void;
    /** A full page came back: the list ends in a sentinel that asks for the next one when scrolled into view. */
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
    /** How many the whole search matched; null where the API did not say. Capped at 250 there, read as "250+". */
    total: number | null;
    /** A hit pressed: the card's full sheet, with its price line, over the palette. */
    onOpen: (card: PokemonCard) => void;
}) {
    const filtering = Boolean(filters.set || filters.type);
    // Which catalogue is asked; the set and the type are the English one's facets, so its chips go with it.
    const language = filters.language ?? "en";
    const searching = inputValue.trim().length >= 2 || filtering;
    // Before a letter is typed: the last few terms, each a press away, and a row to be rid of
    // them. Kept in this browser (use-recent-searches.ts); the Add dialog offers the same.
    const recent = useRecentSearches();
    const groups: CommandMenuGroupType[] =
        !searching && !inputValue.trim() && recent.length
            ? [
                  {
                      id: "recent",
                      title: "Recent searches",
                      items: [
                          ...recent.map((term) => ({
                              id: `recent:${term}`,
                              type: "icon" as const,
                              icon: ClockRewind,
                              label: term,
                              onAction: () => {
                                  onInputChange(term);
                                  focusField();
                              },
                          })),
                          { id: CLEAR_RECENT, type: "icon" as const, icon: Trash01, label: "Clear recent searches", onAction: clearSearches },
                      ],
                  },
              ]
            : hits.length
              ? [
                    {
                        id: "cards",
                        title: total === null ? "Cards" : total >= SEARCH_WINDOW ? `${SEARCH_WINDOW}+ cards` : `${total} ${total === 1 ? "card" : "cards"}`,
                        items: [
                            ...hits.map((c) => ({
                                id: c.id,
                                type: "image" as const,
                                src: c.image,
                                alt: c.name,
                                label: c.name,
                                description: [c.set, c.number ? `#${c.number}` : null, c.rarity].filter(Boolean).join(" · "),
                                stacked: true,
                                /* Pressing a hit, by pointer or Enter, opens its sheet: the card, its price line and
                                   the two ways to take it, the way a set page opens a tile nobody holds. */
                                onAction: () => onOpen(c),
                            })),
                            // The sentinel is an item of the list so it scrolls with it; the section renders it as
                            // the kit's load-more row rather than as a card.
                            ...(hasMore ? [{ id: MORE, label: "Loading more…" }] : []),
                        ],
                    },
                ]
              : [];

    return (
        <CommandMenu
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            filter={false}
            inputValue={inputValue}
            onInputChange={onInputChange}
            items={groups}
            placeholder="Search a card"
            shortcut={null}
            emptyState={
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-tertiary">
                    {/* A live region, as the other search boxes have: the kit's empty state is not one, so a
                        screen reader heard nothing when the answer changed. */}
                    <output aria-live="polite">
                        {!searching ? "Type to search for a card." : loading ? "Searching…" : failed ? "The card service didn't answer." : "No cards found."}
                    </output>
                    {searching && !loading && failed ? (
                        <Button
                            size="sm"
                            color="secondary"
                            onClick={() => {
                                onRetry();
                                focusField();
                            }}
                        >
                            Try again
                        </Button>
                    ) : null}
                </div>
            }
            dialogClassName={cx("max-w-[calc(100vw-2rem)]")}
        >
            <AriaHeading slot="title" className="sr-only">
                Search cards
            </AriaHeading>

            {/* The chips that narrow the hits, one row, the kit's filter chips throughout (Bart's call: the
                language is a filter like the others, not a row of flags). Always there, because the language
                is chosen before the name is typed. English is the default and needs no chip value. The set
                list is the chosen shelf's; the type is the English catalogue's alone, since TCGdex publishes
                none for the other shelves, so that chip goes with them. */}
            <FilterChipRow className="border-b border-secondary px-4 py-2" onClear={filtering ? () => onFiltersChange({}) : undefined}>
                <LanguageFilterChip value={language} onChange={(next) => onFiltersChange(next === "en" ? {} : { language: next })} />
                <FilterChip label="Set" value={filters.set} options={sets} onChange={(set) => onFiltersChange({ ...filters, set })} />
                {language === "en" ? (
                    <FilterChip
                        label="Type"
                        value={filters.type}
                        options={CARD_TYPES.map((t) => ({ value: t, label: t }))}
                        onChange={(type) => onFiltersChange({ ...filters, type })}
                    />
                ) : null}
            </FilterChipRow>

            <CommandMenu.Group>
                <CommandMenu.List>
                    {(group: CommandMenuGroupType) => (
                        <CommandMenu.Section {...group}>
                            {(item) =>
                                item.id === MORE ? (
                                    <ListBoxLoadMoreItem key={MORE} onLoadMore={onLoadMore} isLoading={loadingMore} className="px-4 py-3">
                                        {/* The kit's indicator rather than the words alone: the row only exists while the
                                            next batch is on its way, and a line of grey text in a list of cards read as
                                            one more result. */}
                                        <LoadingIndicator size="sm" label={item.label} />
                                    </ListBoxLoadMoreItem>
                                ) : (
                                    <CommandMenu.Item key={item.id} {...item} />
                                )
                            }
                        </CommandMenu.Section>
                    )}
                </CommandMenu.List>
            </CommandMenu.Group>
        </CommandMenu>
    );
}
