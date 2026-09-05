"use client";

import { CardImage } from "@/components/app/card-image";
import { FavoriteStar } from "@/components/app/favorite-star";
import type { PublicCard } from "@/lib/cards";
import type { CardsSize } from "@/lib/cards-view";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

// Presentational grid of card thumbnails. Selection is owned by CardsView. Generic over the card
// shape so the public profile can pass `PublicCard`; the favourite star and the price only show when
// the field exists, so a public page never carries a price.
/** Tiles that are on screen at load on any width: the widest grid shows six per row. */
const FIRST_ROW = 6;

// Tiles per row at each size: small packs the pictures, large shows them. Exported for the
// Pokédex, which draws the same tiles so a folder reads the same whichever way it is shown.
export const GRID_COLUMNS: Record<CardsSize, string> = {
    sm: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8",
    md: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    lg: "grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
};

export function CardsGrid<T extends PublicCard & { is_favorite?: boolean | null; price?: number | null }>({
    cards,
    onSelect,
    size = "md",
}: {
    cards: T[];
    onSelect: (card: T) => void;
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
                        onClick={() => onSelect(card)}
                        className="flex h-full w-full pressable cursor-pointer flex-col gap-2 rounded-2xl bg-primary p-2 text-left shadow-lift-xs outline-focus-ring hover:bg-secondary focus-visible:outline-2"
                    >
                        {/* No ring on the picture: a card carries its own printed border, and a hairline over it read as a second one. */}
                        {/* Nothing of ours around the picture: a card carries its own printed border, and a hairline
                            or a grey box behind it read as a second one. The grey stays only where there is no picture. */}
                        <div className={cx("relative aspect-[63/88] w-full overflow-hidden rounded-lg", !card.image_url && "bg-quaternary")}>
                            {card.image_url ? (
                                <CardImage
                                    src={card.image_url}
                                    alt=""
                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 213px"
                                    className="object-contain"
                                    // The first row is on screen at load and one of it is the largest paint; it must not wait for lazy loading.
                                    priority={i < FIRST_ROW}
                                />
                            ) : (
                                // No art in our source (e.g. some promos) — show the name so the tile still reads as a card.
                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center">
                                    <span className="line-clamp-4 text-sm font-medium text-secondary">{card.name}</span>
                                    {card.number ? <span className="text-xxs text-quaternary">#{card.number}</span> : null}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                <span className="truncate">{card.name}</span>
                                {card.is_favorite ? <FavoriteStar /> : null}
                            </span>
                            <span className="truncate text-xs text-tertiary">
                                {[card.set_name, card.number ? `#${card.number}` : null].filter(Boolean).join(" · ")}
                            </span>
                            {/* The market price carries the weight of the name, as a marketplace tile does; the set line stays quiet. */}
                            {card.price != null ? (
                                <span className="mt-0.5 text-sm font-medium text-primary tabular-nums">
                                    <span className="sr-only">Market price </span>
                                    {formatPrice(card.price)}
                                </span>
                            ) : null}
                        </div>
                    </button>
                </div>
            ))}
        </div>
    );
}
