"use client";

import { CardImage } from "@/components/app/card-image";
import { FavoriteStar } from "@/components/app/favorite-star";
import type { PublicCard } from "@/lib/cards";
import { formatPrice } from "@/lib/format";

// Presentational grid of card thumbnails. Selection is owned by CardsView. Generic over the card
// shape so the public profile can pass `PublicCard`; the favourite star and the price only show when
// the field exists, so a public page never carries a price.
export function CardsGrid<T extends PublicCard & { is_favorite?: boolean | null; price?: number | null }>({
    cards,
    onSelect,
}: {
    cards: T[];
    onSelect: (card: T) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {cards.map((card) => (
                <button
                    key={card.id}
                    type="button"
                    onClick={() => onSelect(card)}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl p-2 text-left outline-focus-ring transition hover:bg-secondary focus-visible:outline-2"
                >
                    <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg bg-quaternary">
                        {card.image_url ? (
                            <CardImage
                                src={card.image_url}
                                alt=""
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 213px"
                                className="object-contain"
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
                        <span className="truncate text-sm font-medium text-primary">
                            {card.is_favorite ? <FavoriteStar /> : null}
                            {card.name}
                        </span>
                        <span className="truncate text-xs text-tertiary">
                            {[card.set_name, card.number ? `#${card.number}` : null].filter(Boolean).join(" · ")}
                        </span>
                        {/* The market price carries the weight of the name, as a marketplace tile does; the set line stays quiet. */}
                        {card.price != null ? <span className="mt-0.5 text-sm font-medium text-primary tabular-nums">{formatPrice(card.price)}</span> : null}
                    </div>
                </button>
            ))}
        </div>
    );
}
