"use client";

import type { ReactNode } from "react";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { warmCard } from "@/components/app/card-memo";
import { CardTile } from "@/components/app/card-tile";
import { FavoriteStar } from "@/components/app/favorite-star";
import { FlagIcon } from "@/components/app/flag-icon";
import { cardLabel } from "@/lib/card-label";
import type { PublicCard } from "@/lib/cards";
import { type CardsSize, GRID_COLUMNS, TILE_SIZES, TILE_WIDTH } from "@/lib/cards-view";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

// Presentational grid of card thumbnails. Selection is owned by CardsView. Generic over the card
// shape so the public profile can pass `PublicCard`; the favourite star and the price only show when
// the field exists, so a public page never carries a price.
/** Tiles that are on screen at load on any width: the widest grid shows six per row. */
const FIRST_ROW = 6;

// Tiles per row at each size: small packs the pictures, large shows them. On a phone four,
// three and two: two across at medium read as large, and a card is legible at a quarter of the
// width because the words under it truncate. Exported for the Pokédex, which draws the same
// tiles so a folder reads the same whichever way it is shown.

export function CardsGrid<T extends PublicCard & { is_favorite?: boolean | null; price?: number | null; quantity?: number | null; owned?: boolean | null }>({
    holder = "you",
    cards,
    onSelect,
    size = "md",
    action,
}: {
    /** Whose cards these are, for the words a screen reader gets under a count: the person looking, or the owner of a public page. */
    holder?: "you" | "owner";
    cards: T[];
    /** The card, and the list it was picked from, so a sheet knows what is either side of it. */
    onSelect: (card: T, siblings: T[]) => void;
    size?: CardsSize;
    /**
     * The one thing a tile of this list can do, drawn on the tile: "Got it" on the wishlist.
     * A sibling of the tile, not a child of it — the tile is a button, and a button inside a
     * button is not HTML and reads as one control to a screen reader. It sits in the words'
     * bottom row, in the slot the count keeps on every other list (a wish has no count), so the
     * picture stays whole. Shown on hover, on focus within the tile and always on a touch screen,
     * so a keyboard reaches it and a finger never has to hover.
     *
     * Where the row is too narrow for the words and the price both, the button moves: on a
     * phone's three-across grid (a tile is 104 px) it takes a row of its own under the price, and
     * on the small grid (86 to 128 px at any width) it is the mark alone, `compact`, with the
     * card's name in its accessible name still.
     */
    action?: (card: T, compact: boolean) => ReactNode;
}) {
    // The small grid keeps the button in the row at every width, so the row is the button's
    // height; the others only from md, under which the button has a row of its own.
    const inRow = action ? (size === "sm" ? "min-h-9 items-center" : "items-baseline md:min-h-9 md:items-center") : "items-baseline";
    return (
        <div className={cx("grid gap-4", GRID_COLUMNS[size])}>
            {cards.map((card, i) => (
                // The arrival is on a box of its own: the button already transitions its colours and its
                // scale, and three utilities naming transition-property on one element leave one standing.
                // The first two rows arrive one after another, 20 ms apart; everything under them comes in
                // together once that wave has passed. A batch appended on scroll sits below the fold, so
                // its wave is not seen and its delay has passed by the time it is.
                <div
                    key={card.id}
                    className={cx("arrive", action && "group relative")}
                    style={{ "--arrive-delay": `${Math.min(i, 12) * 20}ms` } as React.CSSProperties}
                >
                    <CardTile
                        onSelect={() => onSelect(card, cards)}
                        onWarm={() => warmCard(card.tcg_id)}
                        picture={
                            /* Nothing of ours around the picture: a card carries its own printed border, and a hairline
                               or a grey box behind it read as a second one. A card with no picture shows its back. */
                            <div className="relative aspect-card w-full overflow-hidden rounded-card">
                                {card.image_url ? (
                                    <CardImage
                                        src={card.image_high_url ?? card.image_url}
                                        fallbackSrc={card.image_url}
                                        width={TILE_WIDTH[size]}
                                        sizes={TILE_SIZES[size]}
                                        quality={size === "lg" ? 75 : 60}
                                        alt=""
                                        className="object-cover"
                                        // The first row is on screen at load and one of it is the largest paint; it must not wait for lazy loading.
                                        priority={i < FIRST_ROW}
                                    />
                                ) : (
                                    // No art in any catalogue (some promos, most Chinese cards): face down. The words
                                    // beside it name the card, as they do for every tile.
                                    <CardBack width={TILE_WIDTH[size]} sizes={TILE_SIZES[size]} priority={i < FIRST_ROW} />
                                )}
                            </div>
                        }
                        words={
                            <div className="flex flex-col">
                                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                    <span className="truncate">{card.name}</span>
                                    {card.is_favorite ? <FavoriteStar /> : null}
                                    {/* A copy in another language wears its flag; English, which nearly every card is, stays plain. */}
                                    {"language" in card && typeof card.language === "string" && card.language !== "en" ? (
                                        <FlagIcon language={card.language} />
                                    ) : null}
                                </span>
                                <span className="truncate text-xs text-tertiary">{cardLabel(card, size)}</span>
                                {/* How many you hold, then what one is worth: the count on the left and the price
                                    against the right edge, so a column of tiles reads down either side. A card is
                                    listed once however many copies you have, so without this the only way to learn
                                    you own three was to open the sheet.

                                    Every tile, including the ones at one. It was hidden below two — a ×1 under all
                                    forty-eight of them is a column of the same character — but a number that appears
                                    only sometimes is one you have to notice the absence of, and the owner would
                                    rather read it down the column than work it out. */}
                                {card.quantity != null || card.price != null || action ? (
                                    <span className={cx("mt-0.5 flex justify-between gap-2 text-sm font-medium tabular-nums", inRow)}>
                                        <span className="text-tertiary">
                                            {/* A wish is not a holding: no count under it, and no "×1" that read as one.
                                                On a visitor's screen the count is the owner's, and says so — a screen
                                                reader used to be told "You hold" about somebody else's binder. */}
                                            {card.quantity != null && card.owned !== false ? (
                                                <>
                                                    <span className="sr-only">{holder === "owner" ? "Holds " : "You hold "}</span>×{card.quantity}
                                                </>
                                            ) : null}
                                        </span>
                                        {card.price != null ? (
                                            <span className="text-primary">
                                                <span className="sr-only">Near Mint price </span>
                                                {formatPrice(card.price)}
                                            </span>
                                        ) : null}
                                    </span>
                                ) : null}
                            </div>
                        }
                    />
                    {action ? (
                        <div
                            className={cx(
                                "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100",
                                size === "sm" ? "absolute bottom-0 left-0" : "mt-2 flex *:flex-1 md:absolute md:bottom-0 md:left-0 md:mt-0 md:block",
                            )}
                        >
                            {action(card, size === "sm")}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
