"use client";

import { type ReactNode, Suspense, use, useState } from "react";
import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import { GRID_COLUMNS } from "@/components/app/cards-grid";
import { DexSlider } from "@/components/app/dex-slider";
import { DexSkeleton } from "@/components/app/skeletons";
import { ViewMenu } from "@/components/app/view-menu";
import type { CardsSize } from "@/lib/cards-view";
import type { DexList, NamedDexSlot } from "@/lib/dex-groups";
import { cx } from "@/utils/cx";

/** The width a tile draws its picture at, per breakpoint: the same as a card in a list. */
const SIZES = "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 213px";

const dexNumber = (n: number) => `#${String(n).padStart(3, "0")}`;

// A folder as a Pokédex: one tile per number, drawn as the same tile a list of cards uses, so
// the Pokédex reads as one of the folders and not as a different screen. A number you hold
// shows its card (several: a slider), its name and how many you have; one you do not is the
// same tile in grey, named, so a person knows what to find.
export function DexGrid({ slots, size = "md" }: { slots: NamedDexSlot[]; size?: CardsSize }) {
    return (
        <div className={cx("grid gap-4", GRID_COLUMNS[size])}>
            {slots.map((slot) => (
                <DexTile key={slot.number} slot={slot} />
            ))}
        </div>
    );
}

function DexTile({ slot }: { slot: NamedDexSlot }) {
    const held = slot.cards.length;
    const line = `${dexNumber(slot.number)} · ${held === 0 ? "Missing" : held === 1 ? "1 card" : `${held} cards`}`;
    const words = (
        <div className="flex flex-col">
            <span className={cx("truncate text-sm font-medium", held === 0 ? "text-tertiary" : "text-primary")}>{slot.name}</span>
            <span className="truncate text-xs text-tertiary">{line}</span>
        </div>
    );

    if (held === 0) {
        return (
            <div className="flex flex-col gap-2 rounded-2xl bg-primary p-2 shadow-lift-xs">
                <div className="flex aspect-[63/88] w-full items-center justify-center rounded-lg bg-tertiary">
                    <span className="text-sm font-medium text-quaternary tabular-nums">{dexNumber(slot.number)}</span>
                </div>
                {words}
            </div>
        );
    }

    if (held > 1) {
        return (
            <div className="flex flex-col gap-2 rounded-2xl bg-primary p-2 shadow-lift-xs">
                <DexSlider cards={slot.cards} />
                {words}
            </div>
        );
    }

    const card = slot.cards[0]!;
    return (
        <Link
            href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`}
            className="flex pressable cursor-pointer flex-col gap-2 rounded-2xl bg-primary p-2 text-left shadow-lift-xs outline-focus-ring hover:bg-secondary focus-visible:outline-2"
        >
            <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg bg-quaternary ring-1 ring-image ring-inset">
                {card.imageUrl ? (
                    <CardImage src={card.imageUrl} alt="" sizes={SIZES} className="object-contain" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center">
                        <span className="line-clamp-4 text-sm font-medium text-secondary">{card.name}</span>
                    </div>
                )}
            </div>
            {words}
        </Link>
    );
}

// The Pokédex body under the shared row: the View menu offers the size alone, a slot being
// neither a grid tile nor a table row. The row is drawn at once; the slots are a promise the
// page did not wait for, and show their outline until every card has been read.
export function DexView({
    dex,
    narrowed,
    initialSize = "md",
    toolbar,
    noHits,
    empty,
}: {
    dex: Promise<DexList>;
    narrowed: boolean;
    initialSize?: CardsSize;
    toolbar?: ReactNode;
    /** When a search or a filter finds nothing. */
    noHits: ReactNode;
    /** When the folder holds nothing at all. */
    empty: ReactNode;
}) {
    const [size, setSize] = useState(initialSize);
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="contents">{toolbar}</div>
                <ViewMenu view="grid" size={size} onView={() => {}} onSize={setSize} layouts={false} />
            </div>
            <Suspense fallback={<DexSkeleton />}>
                <DexSlots dex={dex} size={size} narrowed={narrowed} noHits={noHits} empty={empty} />
            </Suspense>
        </div>
    );
}

function DexSlots({ dex, size, narrowed, noHits, empty }: { dex: Promise<DexList>; size: CardsSize; narrowed: boolean; noHits: ReactNode; empty: ReactNode }) {
    const d = use(dex);
    if (d.total === 0) return <>{narrowed ? noHits : empty}</>;
    return <DexGrid slots={d.slots} size={size} />;
}
