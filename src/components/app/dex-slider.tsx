"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import type { DexCard } from "@/lib/pokedex";

// One Pokédex slot holding several owned cards: a horizontal scroll-snap slider. Swipe on
// touch/trackpad; the arrows (shown on hover) let a mouse-only desktop page through them too.
export function DexSlider({ number, cards }: { number: number; cards: DexCard[] }) {
    const ref = useRef<HTMLDivElement>(null);

    const scroll = (direction: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
    };

    return (
        <div className="group relative aspect-3/4 overflow-hidden rounded-md ring-1 ring-secondary ring-inset">
            <div ref={ref} className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {cards.map((card) => (
                    <Link key={card.id} href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`} className="relative size-full shrink-0 snap-start">
                        {card.imageUrl ? (
                            <CardImage
                                src={card.imageUrl}
                                alt={card.name}
                                sizes="(max-width: 640px) 25vw, (max-width: 768px) 17vw, (max-width: 1024px) 13vw, (max-width: 1280px) 10vw, 107px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center bg-quaternary p-1 text-center text-xxs text-quaternary">{card.name}</div>
                        )}
                    </Link>
                ))}
            </div>

            <span className="pointer-events-none absolute top-1 left-1 rounded-full bg-alpha-black/60 px-1.5 py-0.5 text-xxs font-semibold text-alpha-white">
                {cards.length}
            </span>

            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-alpha-black/55 px-1 py-0.5 text-center text-xxs font-medium text-alpha-white">
                {number}
            </span>

            <button
                type="button"
                aria-label="Previous card"
                onClick={() => scroll(-1)}
                className="absolute top-1/2 left-0.5 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full bg-alpha-black/60 outline-focus-ring focus-visible:outline-2 lg:group-focus-within:flex lg:group-hover:flex"
            >
                <ChevronLeft className="size-4 text-alpha-white" />
            </button>
            <button
                type="button"
                aria-label="Next card"
                onClick={() => scroll(1)}
                className="absolute top-1/2 right-0.5 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full bg-alpha-black/60 outline-focus-ring focus-visible:outline-2 lg:group-focus-within:flex lg:group-hover:flex"
            >
                <ChevronRight className="size-4 text-alpha-white" />
            </button>
        </div>
    );
}
