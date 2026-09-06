"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { CardImage } from "@/components/app/card-image";
import type { DexCard } from "@/lib/api-shapes";
import { cx } from "@/utils/cx";

// One Pokédex number held as several cards: a horizontal scroll-snap slider in a card tile's
// picture box. Swipe on touch/trackpad; the arrows (shown on hover) let a mouse-only desktop
// page through them too. The number and the count are written under the tile, not over it.
export function DexSlider({ cards, onSelect }: { cards: DexCard[]; onSelect?: (card: DexCard) => void }) {
    const ref = useRef<HTMLDivElement>(null);

    const scroll = (direction: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
    };

    return (
        <div className="group relative aspect-card w-full overflow-hidden rounded-card">
            <div ref={ref} className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {cards.map((card) => (
                    <Slide key={card.id} onSelect={onSelect ? () => onSelect(card) : undefined}>
                        {card.imageUrl ? (
                            <CardImage src={card.imageHighUrl ?? card.imageUrl} quality={75} alt={card.name} className="object-cover" />
                        ) : (
                            <div className="flex size-full items-center justify-center bg-quaternary p-3 text-center text-sm font-medium text-secondary">
                                {card.name}
                            </div>
                        )}
                    </Slide>
                ))}
            </div>

            <button
                type="button"
                aria-label="Previous card"
                onClick={() => scroll(-1)}
                className="absolute top-1/2 left-1 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-alpha-black/60 outline-focus-ring focus-visible:outline-2 lg:group-focus-within:flex lg:group-hover:flex pointer-coarse:flex"
            >
                <ChevronLeft className="size-4 text-alpha-white" />
            </button>
            <button
                type="button"
                aria-label="Next card"
                onClick={() => scroll(1)}
                className="absolute top-1/2 right-1 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-alpha-black/60 outline-focus-ring focus-visible:outline-2 lg:group-focus-within:flex lg:group-hover:flex pointer-coarse:flex"
            >
                <ChevronRight className="size-4 text-alpha-white" />
            </button>
        </div>
    );
}

// A slide opens its card's sheet, or on a public page is a plain frame.
function Slide({ onSelect, children }: { onSelect?: () => void; children: React.ReactNode }) {
    const className = "relative size-full shrink-0 snap-start";
    return onSelect ? (
        <button type="button" onClick={onSelect} className={cx(className, "cursor-pointer outline-focus-ring focus-visible:outline-2")}>
            {children}
        </button>
    ) : (
        <div className={className}>{children}</div>
    );
}
