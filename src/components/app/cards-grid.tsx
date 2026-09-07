"use client";

import { CardImage } from "@/components/app/card-image";
import { FavoriteStar } from "@/components/app/favorite-star";
import { FlagIcon } from "@/components/app/flag-icon";
import { cardLabel } from "@/lib/card-label";
import type { PublicCard } from "@/lib/cards";
import { type CardsSize, GRID_COLUMNS, TILE_WIDTH } from "@/lib/cards-view";
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

export function CardsGrid<T extends PublicCard & { is_favorite?: boolean | null; price?: number | null; quantity?: number | null }>({
    cards,
    onSelect,
    size = "md",
}: {
    cards: T[];
    /** The card, and the list it was picked from, so a sheet knows what is either side of it. */
    onSelect: (card: T, siblings: T[]) => void;
    size?: CardsSize;
}) {
    return (
        <div className={cx("grid gap-4", GRID_COLUMNS[size])}>
            {cards.map((card, i) => (
                // The arrival is on a box of its own: the button already transitions its colours and its
                // scale, and three utilities naming transition-property on one element leave one standing.
                // The first two rows arrive one after another, 20 ms apart; everything under them comes in
                // together once that wave has passed. A batch appended on scroll sits below the fold, so
                // its wave is not seen and its delay has passed by the time it is.
                <div key={card.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 12) * 20}ms` } as React.CSSProperties}>
                    <button
                        type="button"
                        onClick={() => onSelect(card, cards)}
                        // The picture and its words, nothing around them: a card is its own surface, and a tile behind it read as
                        // a second one. The focus ring follows the picture's corners.
                        className="flex h-full w-full pressable cursor-pointer flex-col gap-2 rounded-lg text-left outline-offset-2 outline-focus-ring focus-visible:outline-2"
                    >
                        {/* Nothing of ours around the picture: a card carries its own printed border, and a hairline
                            or a grey box behind it read as a second one. The grey stays only where there is no picture. */}
                        <div className={cx("relative aspect-card w-full overflow-hidden rounded-card", !card.image_url && "bg-quaternary")}>
                            {card.image_url ? (
                                <CardImage
                                    src={card.image_high_url ?? card.image_url}
                                    fallbackSrc={card.image_url}
                                    width={TILE_WIDTH[size]}
                                    quality={size === "lg" ? 75 : 60}
                                    alt=""
                                    className="object-cover"
                                    // The first row is on screen at load and one of it is the largest paint; it must not wait for lazy loading.
                                    priority={i < FIRST_ROW}
                                />
                            ) : (
                                // No art in our source (e.g. some promos) — show the name so the tile still reads as a card.
                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center">
                                    <span className="line-clamp-4 text-sm font-medium text-secondary">{card.name}</span>
                                    {card.number ? <span className="text-2xs text-quaternary">#{card.number}</span> : null}
                                </div>
                            )}
                        </div>
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
                            {card.quantity != null || card.price != null ? (
                                <span className="mt-0.5 flex items-baseline justify-between gap-2 text-sm font-medium tabular-nums">
                                    <span className="text-tertiary">
                                        {card.quantity != null ? (
                                            <>
                                                <span className="sr-only">You hold </span>×{card.quantity}
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
                    </button>
                </div>
            ))}
        </div>
    );
}
