"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import { DexSlider } from "@/components/app/dex-slider";
import { ViewMenu } from "@/components/app/view-menu";
import type { CardsSize } from "@/lib/cards-view";
import type { NamedDexSlot } from "@/lib/dex-groups";
import { cx } from "@/utils/cx";

// Slots per row at each size: the Pokédex packs tighter than the card grid, a slot being a square.
const COLUMNS: Record<CardsSize, string> = {
    sm: "grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15",
    md: "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12",
    lg: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9",
};

const SIZES = "(max-width: 640px) 25vw, (max-width: 768px) 17vw, (max-width: 1024px) 13vw, (max-width: 1280px) 10vw, 107px";

// A folder as a Pokédex: one slot per number, the folder's cards in it, an empty slot named so a
// person knows what to find. The same tiles the Pokédex page always had.
export function DexGrid({ slots, size = "md" }: { slots: NamedDexSlot[]; size?: CardsSize }) {
    return (
        <div className={cx("grid gap-2", COLUMNS[size])}>
            {slots.map((slot) => {
                if (slot.cards.length === 0) {
                    return (
                        <div
                            key={slot.number}
                            className="flex aspect-3/4 flex-col items-center justify-center gap-0.5 rounded-md bg-secondary px-1 text-center text-xs font-medium text-quaternary"
                            title={slot.name}
                        >
                            <span>{slot.number}</span>
                            <span className="line-clamp-2 text-xxs font-normal">{slot.name}</span>
                        </div>
                    );
                }
                if (slot.cards.length > 1) return <DexSlider key={slot.number} number={slot.number} cards={slot.cards} />;
                const card = slot.cards[0];
                return (
                    <div key={slot.number} className="relative aspect-3/4 overflow-hidden rounded-md ring-1 ring-image ring-inset">
                        <Link href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`} className="relative block size-full">
                            {card.imageUrl ? (
                                <CardImage src={card.imageUrl} alt={card.name} sizes={SIZES} className="object-cover" />
                            ) : (
                                <div className="flex size-full items-center justify-center bg-quaternary p-1 text-center text-xxs text-quaternary">
                                    {card.name}
                                </div>
                            )}
                        </Link>
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-alpha-black/55 px-1 py-0.5 text-center text-xxs font-medium text-alpha-white">
                            {slot.number}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// The Pokédex body under the shared row: the View menu offers the size alone, a slot being
// neither a grid tile nor a table row.
export function DexView({ slots, initialSize = "md", toolbar }: { slots: NamedDexSlot[]; initialSize?: CardsSize; toolbar?: ReactNode }) {
    const [size, setSize] = useState(initialSize);
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="contents">{toolbar}</div>
                <ViewMenu view="grid" size={size} onView={() => {}} onSize={setSize} layouts={false} />
            </div>
            <DexGrid slots={slots} size={size} />
        </div>
    );
}
