"use client";

import { type ReactNode, memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "@untitledui/icons";
import { arriveDelay } from "@/components/app/arrive-stagger";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { warmCard } from "@/components/app/card-memo";
import { CardTile } from "@/components/app/card-tile";
import { FavoriteStar } from "@/components/app/favorite-star";
import { FlagIcon } from "@/components/app/flag-icon";
import { useListTotals } from "@/components/app/list-totals";
import { PriceChangeLine } from "@/components/app/price-change";
import { TileIconButton } from "@/components/app/tile-icon-button";
import { useCopySteps } from "@/components/app/use-copy-steps";
import { useTileExit } from "@/components/app/use-tile-exit";
import type { PriceChange } from "@/lib/api-shapes";
import { cardLine, copyLine } from "@/lib/card-label";
import type { PublicCard } from "@/lib/cards";
import { type CardsSize, GRID_COLUMNS, TILE_SIZES, TILE_WIDTH } from "@/lib/cards-view";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

// Presentational grid of card thumbnails. Selection is owned by CardsView. Generic over the card
// shape so the public profile can pass `PublicCard`; the favourite star and the price only show when
// the field exists, so a public page never carries a price.
/** Tiles that are on screen at load on any width: the widest grid shows six per row. */
export const FIRST_ROW = 6;

// Tiles per row at each size: small packs the pictures, large shows them. On a phone four,
// three and two: two across at medium read as large, and a card is legible at a quarter of the
// width because the words under it truncate. Exported for the Pokédex, which draws the same
// tiles so a binder reads the same whichever way it is shown.

type GridCard = PublicCard & {
    is_favorite?: boolean | null;
    price?: number | null;
    quantity?: number | null;
    owned?: boolean | null;
    price_change?: PriceChange | null;
    print_image_url?: string | null;
    /** What state the copy is in, for the line under its name. A public profile carries neither. */
    condition?: string | null;
    grade?: string | null;
};

export function CardsGrid<T extends GridCard>({
    holder = "you",
    cards,
    onSelect,
    size = "md",
    action,
    steps = false,
    priority = FIRST_ROW,
    firstPage,
}: {
    /** Whose cards these are, for the words a screen reader gets under a count: the person looking, or the owner of a public page. */
    holder?: "you" | "owner";
    cards: T[];
    /** The card, and the list it was picked from, so a sheet knows what is either side of it. */
    onSelect: (card: T, siblings: T[]) => void;
    size?: CardsSize;
    /**
     * What a tile of this list can do beyond its copies, drawn on the tile: the wishlist's heart and
     * "Got it". A sibling of the tile, not a child of it: the tile is a button, and a button inside
     * a button is not HTML and reads as one control to a screen reader. It sits in a row of its own
     * under the price, round buttons against the right edge: the size and the place of a set
     * tile's, so the buttons under a card are one size on every list. Always shown, as a set's are:
     * a control that appears on hover is one a phone never finds and a keyboard only finds by
     * landing on it.
     */
    action?: (card: T, leave: () => void) => ReactNode;
    /**
     * A minus and a plus under every card you hold, the two a set tile has once a card is yours
     * (Bart's call, 2026-09-13: every list works the same). A tile here is one row, so the copies
     * are that row's.
     */
    steps?: boolean;
    /**
     * How many of the first tiles are on screen at load and must not wait for lazy loading. A list
     * drawn set by set is one grid per set, and only the first set's first row is at the top of the
     * page: every later set, and every batch appended on scroll, passes 0.
     */
    priority?: number;
    /**
     * The ids of the list's first page, for a list drawn as one grid per set: a set's grid that a
     * batch appended on scroll brings in is new, and without this its tiles took the wave as if they
     * were the page's first. Only a tile on both this and the grid's own first draw staggers. Pass a
     * stable reference, so the memoised tiles are not drawn again for it.
     */
    firstPage?: ReadonlySet<string>;
}) {
    /* One press handler for every tile, whatever the parent hands in on each render: a tile is
       memoised, and a new closure per tile per render drew all of them again. It reads the list and
       the parent's handler as they are at the press, from refs a layout effect keeps current. */
    const latest = useRef({ cards, onSelect });
    useLayoutEffect(() => {
        latest.current = { cards, onSelect };
    });
    const select = useCallback((card: T) => latest.current.onSelect(card, latest.current.cards), []);
    /* The first page is what the grid held when it was first drawn: those tiles arrive in a wave.
       A batch appended on scroll and a card the list read again (a new row id) arrive at once, and so
       does a tile the list says was not on its first page. */
    const [drawnFirst] = useState(() => new Set(cards.map((c) => c.id)));
    return (
        <div className={cx("grid gap-4", GRID_COLUMNS[size])}>
            {cards.map((card, i) => (
                <GridCell
                    key={card.id}
                    card={card}
                    arriveDelay={arriveDelay(i, drawnFirst.has(card.id) && (firstPage?.has(card.id) ?? true))}
                    priority={i < priority}
                    size={size}
                    holder={holder}
                    onSelect={select}
                    action={action}
                    steps={steps && card.owned !== false && card.quantity != null}
                />
            ))}
        </div>
    );
}

type GridCellProps<T extends GridCard> = {
    card: T;
    /** How long the tile waits before it arrives (`arriveDelay`). */
    arriveDelay: string;
    priority: boolean;
    size: CardsSize;
    holder: "you" | "owner";
    onSelect: (card: T) => void;
    action?: (card: T, leave: () => void) => ReactNode;
    steps: boolean;
};

// Memoised: a press, a batch appended on scroll or the sheet opening leaves every other tile as it was.
const GridCell = memo(function GridCell<T extends GridCard>({ card, arriveDelay: delay, priority, size, holder, onSelect, action, steps }: GridCellProps<T>) {
    /* Quiet: the list is not drawn again after a press, because a redrawn list starts over from its
       first batch and a card pressed two hundred tiles down took the scroll back to the top. The
       tile says its own count; the next screen you open reads fresh. */
    const totals = useListTotals();
    const {
        held: stepped,
        press,
        error,
        buttons: buttonsRef,
    } = useCopySteps({
        name: card.name,
        held: card.quantity ?? 0,
        rowId: card.id,
        quiet: true,
        // The line under the title: copies, what they are worth, and the row when the tile leaves or comes back.
        onShown: (from, to) => totals?.({ copies: to - from, value: (to - from) * (card.price ?? 0), rows: (to > 0 ? 1 : 0) - (from > 0 ? 1 : 0) }),
    });
    const held = steps ? stepped : card.quantity;
    // Taken off this list by one of its own buttons (a wish un-hearted), without drawing the list again.
    const [left, setLeft] = useState(false);
    /* Taken to nought: the row is gone, and the toast holds the way back. The count and the line
       under the title have already moved; the tile fades out first and is taken out once that ends,
       or stays if its count comes back while it is leaving. */
    const { ref: cellRef, removed } = useTileExit(left || (steps && held === 0));
    if (removed) return null;
    const buttons = steps || action;

    return (
        // The arrival is on a box of its own: the button already transitions its colours and its
        // scale, and three utilities naming transition-property on one element leave one standing.
        // The first page's first eight tiles arrive one after another, a --stagger-step apart;
        // everything after them, and every batch appended on scroll, comes in at once.
        // A column that fills its grid row, so the price and the buttons sit at one height across the row
        // whether or not a tile has the printing's line above them (Bart, 2026-09-16).
        <div ref={cellRef} className="flex arrive flex-col" style={{ "--arrive-delay": delay } as React.CSSProperties}>
            <CardTile
                onSelect={() => onSelect(card)}
                // The buttons have a row of their own in the cell, so the tile must not fill the cell: h-full
                // took the whole of it and pushed them out under the next row's pictures, where a tap on
                // one hit a picture.
                className={buttons ? "h-auto flex-1" : undefined}
                onWarm={() => warmCard(card.tcg_id, "language" in card ? (card.language as string | null) : null)}
                picture={
                    /* Nothing of ours around the picture: a card carries its own printed border, and a hairline
                       or a grey box behind it read as a second one. A card with no picture shows its back. */
                    <div className="relative aspect-card w-full overflow-hidden rounded-card">
                        {card.image_url ? (
                            /* The printing the copy is, where it has a picture of its own: an Unlimited
                               Charizard shows no 1st Edition stamp, a Poké Ball reverse its pattern. */
                            <CardImage
                                src={card.print_image_url ?? card.image_high_url ?? card.image_url}
                                fallbackSrc={card.image_url}
                                width={TILE_WIDTH[size]}
                                sizes={TILE_SIZES[size]}
                                quality={size === "lg" ? 75 : 60}
                                alt=""
                                className="object-cover"
                                // The first row is on screen at load and one of it is the largest paint; it must not wait for lazy loading.
                                priority={priority}
                            />
                        ) : (
                            // No art in any catalogue (some promos, the odd Japanese card): face down. The words
                            // beside it name the card, as they do for every tile.
                            <CardBack width={TILE_WIDTH[size]} sizes={TILE_SIZES[size]} priority={priority} />
                        )}
                    </div>
                }
                words={
                    <div className="flex flex-1 flex-col">
                        <span className="flex items-center gap-1 text-sm font-medium text-primary">
                            <span className="truncate">{card.name}</span>
                            {card.is_favorite ? <FavoriteStar /> : null}
                            {/* A copy in another language wears its flag; English, which nearly every card is, stays plain. */}
                            {"language" in card && typeof card.language === "string" && card.language !== "en" ? <FlagIcon language={card.language} /> : null}
                        </span>
                        <span className="truncate text-xs text-tertiary">{cardLine(card)}</span>
                        {/* Which printing the copy is and what state it is in: "Holo · Near Mint",
                            "1st Edition · Holo · PSA 10" (copyLine). Each kind of copy is a tile of its own, and two
                            of one card looked alike. A wish, with no printing chosen, has no line. */}
                        {copyLine(card) ? <span className="truncate text-xs text-tertiary">{copyLine(card)}</span> : null}
                        {/* What one is worth, then how many you hold: the price on the left under the name it
                            belongs to, the count against the right edge, as a set tile has them (Bart's call,
                            2026-09-13). A card is listed once however many copies you have, so without the
                            count the only way to learn you own three was to open the sheet.

                            Every tile, including the ones at one. It was hidden below two (a ×1 under all
                            forty-eight of them is a column of the same character), but a number that appears
                            only sometimes is one you have to notice the absence of, and the owner would
                            rather read it down the column than work it out. */}
                        {held != null || card.price != null ? (
                            <span className="mt-auto flex items-baseline gap-2 pt-0.5 text-sm font-medium tabular-nums">
                                {card.price != null ? (
                                    <span className="text-primary">
                                        <span className="sr-only">Market price </span>
                                        {formatPrice(card.price)}
                                    </span>
                                ) : null}
                                {/* A wish is not a holding: no count under it, and no "×1" that read as one.
                                    On a visitor's screen the count is the owner's, and says so; a screen
                                    reader used to be told "You hold" about somebody else's binder. Polite, so
                                    a press on the plus says the new count. */}
                                <span aria-live={steps ? "polite" : undefined} className="ml-auto text-tertiary">
                                    {held != null && card.owned !== false ? (
                                        <>
                                            <span className="sr-only">{holder === "owner" ? "Holds " : "You hold "}</span>×{held}
                                        </>
                                    ) : null}
                                </span>
                            </span>
                        ) : null}
                        {/* On a list sorted by price change: the move over its period, under the price. */}
                        <PriceChangeLine change={card.price_change} />
                    </div>
                }
            />
            {buttons ? (
                <div ref={buttonsRef} className="mt-1 flex justify-end gap-1">
                    {steps ? (
                        <>
                            <TileIconButton
                                icon={Minus}
                                label={(held ?? 0) > 1 ? `Remove a copy of ${card.name}` : `Remove ${card.name} from your collection`}
                                onPress={() => press((held ?? 1) - 1)}
                            />
                            <TileIconButton icon={Plus} label={`Add a copy of ${card.name}`} onPress={() => press((held ?? 0) + 1)} />
                        </>
                    ) : null}
                    {action?.(card, () => {
                        setLeft(true);
                        totals?.({ copies: -(card.quantity ?? 1), value: -(card.quantity ?? 1) * (card.price ?? 0), rows: -1 });
                    })}
                </div>
            ) : null}
            {/* Announced when it appears; the tile keeps its place so the grid does not jump. */}
            {steps && error ? (
                <p role="alert" className="text-xs text-error-primary">
                    {error}
                </p>
            ) : null}
        </div>
    );
}) as <T extends GridCard>(props: GridCellProps<T>) => ReactNode;
