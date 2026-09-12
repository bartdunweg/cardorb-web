"use client";

import { type ReactNode, useContext, useEffect, useRef } from "react";
import { ChevronLeft, Trash01, XClose } from "@untitledui/icons";
import { Heading as AriaHeading, ListBoxLoadMoreItem } from "react-aria-components";
import type { CatalogueFilters, PokemonCard } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import { FilterChip, FilterChipRow, type FilterOption } from "@/components/app/filter-chip";
import { LanguageFilterChip } from "@/components/app/language-filter-chip";
import { CommandMenu, CommandMenuContext, type CommandMenuGroupType } from "@/components/application/command-menus/command-menu";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { clearRecentCards, rememberCard, useRecentCards } from "@/hooks/use-recent-cards";
import { CARD_TYPES } from "@/lib/card-types";
import { formatDate, formatPrice } from "@/lib/format";
import { FULL_ART } from "@/lib/full-art";
import { searchHitDescription } from "@/lib/search-hit";
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

// Beside the hits on a desktop; on a phone over them, the whole screen under the field, with Back
// to the hits at its top: the highlighted card's scan, everything the catalogue says about it,
// what it trades at, and the two ways to take it.
function CardPreview({
    card,
    adding,
    onAdd,
    onView,
}: {
    card: PokemonCard;
    /** Which list this card is on its way to, or null: the button that was pressed carries the spinner. */
    adding: "collection" | "wishlist" | null;
    onAdd: (target: "collection" | "wishlist") => void;
    onView: () => void;
}) {
    // A card that has stood here a second was looked at, and goes to the front of the palette's
    // "Recently viewed" (use-recent-cards.ts). A second, so arrowing down a list of hits does not
    // count every row it passes as a visit.
    useEffect(() => {
        const t = setTimeout(() => rememberCard(card), VIEWED_AFTER_MS);
        return () => clearTimeout(t);
    }, [card]);
    // Back, on a phone: the selection is the preview, so clearing it is the way back to the hits.
    // Focus goes to the list the preview covered, not the field: the field would raise the
    // keyboard over the hits just uncovered. Found from this box, not the pressed button: iOS
    // gives a tapped button no focus, so the button's own ancestors are not there to ask.
    const box = useRef<HTMLDivElement>(null);
    const { setSelectedKeys } = useContext(CommandMenuContext);
    const back = () => {
        setSelectedKeys(new Set());
        box.current?.closest('[role="dialog"]')?.querySelector<HTMLElement>('[role="listbox"]')?.focus();
    };
    return (
        <div
            ref={box}
            /* As tall as the hits beside it and no taller, the kit's 424 px at most: on a short screen the
               dialog shrinks to the window, the hits with it, and the preview keeps their height and scrolls
               inside. It used to stop at 70 vh on its own, a hand short of the hits' edge, and its children could
               shrink: the scan, the one with nothing inside to hold it open, went to nothing first (measured at
               620 px). */
            className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto border-secondary p-6 *:shrink-0 max-md:border-t max-sm:absolute max-sm:inset-0 max-sm:z-10 max-sm:border-t-0 max-sm:bg-primary md:max-h-106 md:w-90 md:border-l"
        >
            <Button
                color="secondary"
                size="md"
                iconLeading={ChevronLeft}
                aria-label="Back to the results"
                className="-mt-2 -ml-2 self-start sm:hidden"
                onClick={back}
            />
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

            {/* The two ways to take it, before the facts: what you came to do is in view on any screen, and
                the facts scroll under it (Bart's call, 2026-09-12). Owned or wished for, never both. A card
                you hold closes both buttons; a wish closes its own and leaves the collection open, because
                taking a wished card is what settles a wish. The hit itself says which it is (takenHit marks
                it the moment a press lands). */}
            <div className="flex flex-col gap-2">
                <Button
                    onClick={() => {
                        onAdd("collection");
                        focusField();
                    }}
                    isDisabled={adding !== null || card.owned}
                    isLoading={adding === "collection"}
                    showTextWhileLoading
                    className="w-full"
                >
                    {card.owned ? "In your collection" : adding === "collection" ? "Adding…" : "Add to collection"}
                </Button>
                <Button
                    color="secondary"
                    onClick={() => {
                        onAdd("wishlist");
                        focusField();
                    }}
                    isDisabled={adding !== null || card.owned || card.wishlist}
                    isLoading={adding === "wishlist"}
                    showTextWhileLoading
                    className="w-full"
                >
                    {card.wishlist ? "On your wishlist" : adding === "wishlist" ? "Adding…" : "Add to wishlist"}
                </Button>
                {/* The card in full: the sheet over the palette, with the price line, the copies and the
                    binders the preview has no room for. */}
                <Button color="tertiary" onClick={onView} className="w-full">
                    View details
                </Button>
            </div>

            <dl className="flex flex-col divide-y divide-secondary">
                <DetailRow label="Price" value={formatPrice(card.price)} />
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
        </div>
    );
}

/** The id of the row at the end of a full page, the one that asks for the next page. No card carries it. */
const MORE = "more";

/**
 * Focus back to the palette's field. A button that disables itself under the pointer (Add to
 * collection the moment it is pressed) or unmounts (Try again once hits land) drops focus on
 * the page, and a keyboard user is back at the top of the menu. The kit's menu keeps its field to
 * itself, so it is found from the dialog the pressed button (the active element) sits in.
 */
const focusField = () => document.activeElement?.closest('[role="dialog"]')?.querySelector("input")?.focus();

/** The palette's last recent item: not a card, the way out of the list. */
const CLEAR_RECENT = "recent:clear";
/** A recent card's row id: not the card's own, which its hit may carry in the same list. */
const recentId = (card: PokemonCard) => `recent:${card.id}`;
/** How long a card stands in the preview before it counts as viewed. */
const VIEWED_AFTER_MS = 1000;

/** The most the API counts: it reads that many and stops, so that figure means "at least". */
const SEARCH_WINDOW = 250;

const cardsLabel = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;

/**
 * The hits as the list's sections. A hit the browser's catalogue answered carries its heading
 * (`@/lib/card-group`): one section per Pokémon, or per trainer or energy by its name, each
 * saying how many the whole search holds under it, in the order the search put them. A hit
 * without one (the API's answer, on another shelf or for full art) is one section of all the
 * cards, as the palette has always drawn it.
 */
function hitGroups(hits: PokemonCard[], total: number | null): CommandMenuGroupType[] {
    const item = (c: PokemonCard) => ({
        id: c.id,
        type: "image" as const,
        src: c.image,
        alt: c.name,
        label: c.name,
        description: searchHitDescription(c),
        stacked: true,
    });
    if (!hits.every((h) => h.group)) {
        const title = total === null ? "Cards" : total >= SEARCH_WINDOW ? `${SEARCH_WINDOW}+ cards` : cardsLabel(total);
        return [{ id: "cards", title, items: hits.map(item) }];
    }
    const sections = new Map<string, CommandMenuGroupType>();
    for (const hit of hits) {
        const { key, title, size } = hit.group!;
        const section = sections.get(key) ?? { id: `group:${key}`, title: `${title} · ${cardsLabel(size)}`, items: [] };
        section.items.push(item(hit));
        sections.set(key, section);
    }
    return [...sections.values()];
}

// The command palette: the search field, the hits and the preview of the highlighted one, all in
// the one dialog. Loaded by CommandSearchProvider the first time it is opened; the state lives there.
//
// #368 took the preview out and had a hit open the card's sheet over the palette, for the price
// line the preview lacked. Bart wanted the card inside the palette (the scan, its facts and the
// two buttons a glance away, no second panel), so the preview is back, with the price on it
// (Bart's call, 2026-09-11, over the earlier one).
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
    adding,
    onAdd,
    onView,
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
    /** The hit whose add is on its way and which list it is going to, so its buttons wait; null while none is. */
    adding: { id: string; target: "collection" | "wishlist" } | null;
    onAdd: (card: PokemonCard, target: "collection" | "wishlist") => void;
    /** View details pressed in the preview: the card's full sheet over the palette. */
    onView: (card: PokemonCard) => void;
}) {
    const filtering = Boolean(filters.set || filters.type || filters.fullArt);
    // Which catalogue is asked; the set and the type are the English one's facets, so its chips go with it.
    const language = filters.language ?? "en";
    const searching = inputValue.trim().length >= 2 || filtering;
    // Before a letter is typed: the last few cards looked at here, drawn as the hits are and
    // previewed the same way, and a row to be rid of them. Kept in this browser
    // (use-recent-cards.ts). Cards, not the terms that found them: what was looked at is what
    // gets looked at again (Bart's call, after v0 and Bonsai).
    const recent = useRecentCards();
    const groups: CommandMenuGroupType[] =
        !searching && !inputValue.trim() && recent.length
            ? [
                  {
                      id: "recent",
                      title: "Recently viewed",
                      items: [
                          ...recent.map((c) => ({
                              id: recentId(c),
                              type: "image" as const,
                              src: c.image,
                              alt: c.name,
                              label: c.name,
                              description: searchHitDescription(c),
                              stacked: true,
                          })),
                          { id: CLEAR_RECENT, type: "icon" as const, icon: Trash01, label: "Clear recently viewed", onAction: clearRecentCards },
                      ],
                  },
              ]
            : hits.length
              ? hitGroups(hits, total).map((group, at, all) => ({
                    ...group,
                    items: [
                        ...group.items,
                        // The sentinel is an item of the list so it scrolls with it; the section renders it as
                        // the kit's load-more row rather than as a card. It goes in the last heading, at the end.
                        ...(hasMore && at === all.length - 1 ? [{ id: MORE, label: "Loading more…" }] : []),
                    ],
                }))
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
                    {/* While the answer is on its way: the kit's indicator, with the same words under it. It is
                        hidden from a screen reader because the output below already says them, and the output stays
                        mounted through every state, which is what makes a live region reliable. */}
                    {searching && loading ? (
                        <div aria-hidden="true">
                            <LoadingIndicator size="sm" label="Searching…" />
                        </div>
                    ) : null}
                    <output aria-live="polite" className={cx(searching && loading && "sr-only")}>
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
            // On a phone the palette is the whole screen, edge to edge, sliding up from the bottom as
            // the card sheet does: a card floating in the middle felt like a modal, and the keyboard took
            // its lower half the moment the field was focused (Bart's call, 2026-09-11). It keeps the
            // desktop card's own ground, not the page's: on the page's grey the field's white read as a
            // rounded card of its own at the top, a sheet's head over a list, where it is one surface
            // (Bart's call, 2026-09-11). From sm up it stays the centred card, the page's focus while
            // it is open.
            overlayClassName="max-sm:items-stretch max-sm:p-0"
            dialogClassName={cx(
                "max-w-[calc(100vw-2rem)]",
                "max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:rounded-none max-sm:pt-safe max-sm:pb-safe max-sm:shadow-none max-sm:backdrop-blur-none",
                "max-sm:slide-in-from-bottom max-sm:slide-out-to-bottom max-sm:zoom-in-100 max-sm:zoom-out-100 motion-reduce:max-sm:slide-in-from-bottom-0 motion-reduce:max-sm:slide-out-to-bottom-0",
            )}
        >
            <AriaHeading slot="title" className="sr-only">
                Search cards
            </AriaHeading>

            {/* A phone has no Escape and no scrim beside a full screen to tap: Close, the field's height, at
                the right end of its row. From sm up the scrim around the card is the way out. */}
            <Button
                color="secondary"
                size="md"
                iconLeading={XClose}
                aria-label="Close"
                className="absolute top-2 right-3 sm:hidden"
                onClick={() => onOpenChange(false)}
            />

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
                {/* Full art is a chip of its own rather than an entry under a rarity, because it
                    cuts across the rarities: one full art is an Ultra Rare and the next is an
                    illustration rare (`@/lib/full-art`). On the English shelf alone, which is the
                    only one the catalogue's copy holds the answer for. On its own it is still a
                    question: every full art there is, newest set first. */}
                {language === "en" ? (
                    <FilterChip
                        label="Art"
                        any="Any art"
                        value={filters.fullArt ? FULL_ART : undefined}
                        options={[{ value: FULL_ART, label: "Full art" }]}
                        onChange={(next) => onFiltersChange({ ...filters, fullArt: next === FULL_ART ? true : undefined })}
                    />
                ) : null}
            </FilterChipRow>

            {/* relative: on a phone the preview lays itself over the list, inside this box. */}
            <CommandMenu.Group className="relative flex max-md:flex-col">
                {/* The kit caps the list at 424 px for the card; on a phone the screen is the list's. */}
                <CommandMenu.List className="max-sm:max-h-none">
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

                <CommandMenu.Preview asChild>
                    {({ selectedId }) => {
                        // A hit, or a recent card, which is previewed and taken the same way.
                        const card = hits.find((h) => h.id === selectedId) ?? recent.find((c) => recentId(c) === selectedId);
                        if (!card) return null;
                        return (
                            <CardPreview
                                card={card}
                                adding={adding?.id === card.id ? adding.target : null}
                                onAdd={(target) => onAdd(card, target)}
                                onView={() => onView(card)}
                            />
                        );
                    }}
                </CommandMenu.Preview>
            </CommandMenu.Group>
        </CommandMenu>
    );
}
