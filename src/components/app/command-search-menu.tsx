"use client";

import type { ReactNode } from "react";
import { Heading as AriaHeading, ListBoxLoadMoreItem } from "react-aria-components";
import type { CatalogueFilters, PokemonCard } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import type { AddStatus } from "@/components/app/command-search";
import { FilterChip, FilterChipRow, type FilterOption } from "@/components/app/filter-chip";
import { CommandMenu, type CommandMenuGroupType } from "@/components/application/command-menus/command-menu";
import { Button } from "@/components/base/buttons/button";
import { CARD_TYPES } from "@/lib/card-types";
import { formatDate } from "@/lib/format";
import { cx } from "@/utils/cx";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    if (value === null || value === undefined || value === "") return null;
    return (
        <div className="flex items-start justify-between gap-4 py-2">
            <dt className="shrink-0 text-sm text-tertiary">{label}</dt>
            <dd className="text-right text-sm font-medium text-primary">{value}</dd>
        </div>
    );
}

// Right-hand (desktop) / stacked (mobile) preview showing all available card data + an add action.
function CardPreview({ card, status, onAdd }: { card: PokemonCard; status: AddStatus; onAdd: (target: "collection" | "wishlist") => void }) {
    return (
        <div className="flex w-full flex-col gap-4 overflow-y-auto border-secondary p-6 max-md:border-t md:max-h-[70vh] md:w-90 md:border-l">
            {card.image ? (
                <div className="relative mx-auto aspect-card w-40 overflow-hidden rounded-card ring-1 ring-image ring-inset">
                    <CardImage src={card.image} alt={card.name} width={160} className="object-cover" priority />
                </div>
            ) : (
                <div className="mx-auto h-56 w-40 rounded-xl bg-quaternary" />
            )}

            <div className="flex flex-col gap-0.5 text-center">
                <p className="text-md font-semibold text-primary">{card.name}</p>
                <p className="text-sm text-tertiary">{card.supertype ?? "Card"}</p>
            </div>

            <dl className="flex flex-col divide-y divide-secondary">
                <DetailRow label="Set" value={card.set || null} />
                <DetailRow label="Series" value={card.series} />
                <DetailRow label="Number" value={card.number ? `${card.number}${card.setPrintedTotal ? ` / ${card.setPrintedTotal}` : ""}` : null} />
                <DetailRow label="Rarity" value={card.rarity} />
                <DetailRow label="Type" value={card.types?.length ? card.types.join(", ") : null} />
                <DetailRow label="Subtypes" value={card.subtypes?.length ? card.subtypes.join(", ") : null} />
                <DetailRow label="HP" value={card.hp} />
                <DetailRow label="Pokédex №" value={card.nationalPokedexNumbers?.length ? card.nationalPokedexNumbers.join(", ") : null} />
                <DetailRow label="Artist" value={card.artist} />
                <DetailRow label="Released" value={formatDate(card.releaseDate)} />
            </dl>

            {card.flavorText ? <p className="text-sm text-tertiary italic">{card.flavorText}</p> : null}

            {/* Owned or wished for, never both: the first press settles which, and the other button closes with it. */}
            <div className="flex flex-col gap-2">
                <Button
                    onClick={() => {
                        onAdd("collection");
                        focusField();
                    }}
                    isDisabled={status !== "idle"}
                    className="w-full"
                >
                    {status === "added" ? "Added" : status === "adding" ? "Adding…" : "Add to collection"}
                </Button>
                <Button
                    color="secondary"
                    onClick={() => {
                        onAdd("wishlist");
                        focusField();
                    }}
                    isDisabled={status !== "idle"}
                    className="w-full"
                >
                    {status === "wished" ? "On your wishlist" : status === "adding" ? "Adding…" : "Add to wishlist"}
                </Button>
            </div>
        </div>
    );
}

/** The id of the row at the end of a full page, the one that asks for the next page. No card carries it. */
const MORE = "more";

/**
 * Focus back to the palette's field. A button that disables itself under the pointer — Add to
 * collection the moment it is pressed — or unmounts — Try again once hits land — drops focus on
 * the page, and a keyboard user is back at the top of the menu. The kit's menu keeps its field to
 * itself, so it is found from the dialog the pressed button — the active element — sits in.
 */
const focusField = () => document.activeElement?.closest('[role="dialog"]')?.querySelector("input")?.focus();

/** The most the API counts: it reads that many and stops, so that figure means "at least". */
const SEARCH_WINDOW = 250;

// The command palette: the search field, the hits and the preview of the selected one. Loaded
// by CommandSearchProvider the first time it is opened; the state lives there.
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
    status,
    onAdd,
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
    status: Record<string, AddStatus>;
    onAdd: (card: PokemonCard, target: "collection" | "wishlist") => void;
}) {
    const filtering = Boolean(filters.set || filters.type);
    const searching = inputValue.trim().length >= 2 || filtering;
    const groups: CommandMenuGroupType[] = hits.length
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

            {/* The chips that narrow the hits, once something is typed; a set kept while the term changes stays. */}
            {searching ? (
                <FilterChipRow className="border-b border-secondary px-4 py-2" onClear={filtering ? () => onFiltersChange({}) : undefined}>
                    <FilterChip label="Set" value={filters.set} options={sets} onChange={(set) => onFiltersChange({ ...filters, set })} />
                    <FilterChip
                        label="Type"
                        value={filters.type}
                        options={CARD_TYPES.map((t) => ({ value: t, label: t }))}
                        onChange={(type) => onFiltersChange({ ...filters, type })}
                    />
                </FilterChipRow>
            ) : null}

            <CommandMenu.Group className="flex max-md:flex-col">
                <CommandMenu.List>
                    {(group: CommandMenuGroupType) => (
                        <CommandMenu.Section {...group}>
                            {(item) =>
                                item.id === MORE ? (
                                    <ListBoxLoadMoreItem
                                        key={MORE}
                                        onLoadMore={onLoadMore}
                                        isLoading={loadingMore}
                                        className="px-4 py-3 text-center text-sm text-tertiary"
                                    >
                                        {item.label}
                                    </ListBoxLoadMoreItem>
                                ) : (
                                    <CommandMenu.Item key={item.id} {...item} />
                                )
                            }
                        </CommandMenu.Section>
                    )}
                </CommandMenu.List>

                <CommandMenu.Preview asChild>
                    {({ selectedId }) => {
                        const card = hits.find((h) => h.id === selectedId);
                        if (!card) return null;
                        return <CardPreview card={card} status={status[card.id] ?? "idle"} onAdd={(target) => onAdd(card, target)} />;
                    }}
                </CommandMenu.Preview>
            </CommandMenu.Group>
        </CommandMenu>
    );
}
