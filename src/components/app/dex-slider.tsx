"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import type { DexCard } from "@/lib/api-shapes";

// One Pokédex number held as several cards: a horizontal scroll-snap slider in a card tile's
// picture box. Swipe on touch/trackpad; the arrows (shown on hover) let a mouse-only desktop
// page through them too. The number and the count are written under the tile, not over it.
export function DexSlider({ cards }: { cards: DexCard[] }) {
    const ref = useRef<HTMLDivElement>(null);

    const scroll = (direction: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
    };

    return (
        <div className="group relative aspect-[63/88] w-full overflow-hidden rounded-lg">
            <div ref={ref} className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {cards.map((card) => (
                    <Link key={card.id} href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`} className="relative size-full shrink-0 snap-start">
                        {card.imageUrl ? (
                            <CardImage
                                src={card.imageUrl}
                                alt={card.name}
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 213px"
                                className="object-contain"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center bg-quaternary p-3 text-center text-sm font-medium text-secondary">
                                {card.name}
                            </div>
                        )}
                    </Link>
                ))}
            </div>

            <button
                type="button"
                aria-label="Previous card"
                onClick={() => scroll(-1)}
                className="absolute top-1/2 left-1 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-alpha-black/60 outline-focus-ring focus-visible:outline-2 lg:group-focus-within:flex lg:group-hover:flex"
            >
                <ChevronLeft className="size-4 text-alpha-white" />
            </button>
            <button
                type="button"
                aria-label="Next card"
                onClick={() => scroll(1)}
                className="absolute top-1/2 right-1 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-alpha-black/60 outline-focus-ring focus-visible:outline-2 lg:group-focus-within:flex lg:group-hover:flex"
            >
                <ChevronRight className="size-4 text-alpha-white" />
            </button>
        </div>
    );
}
