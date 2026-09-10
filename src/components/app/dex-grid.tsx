"use client";

import { type ReactNode, Suspense, use, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { listCopies } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import { CardTile } from "@/components/app/card-tile";
import { DexSlider } from "@/components/app/dex-slider";
import { CardsSkeleton } from "@/components/app/skeletons";
import { ViewMenu } from "@/components/app/view-menu";
import { Button } from "@/components/base/buttons/button";
import type { DexCard } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { type CardsSize, GRID_COLUMNS, TILE_SIZES, TILE_WIDTH } from "@/lib/cards-view";
import type { DexList, NamedDexSlot } from "@/lib/dex-groups";
import { cx } from "@/utils/cx";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// grid is drawn long before anyone touches a tile. `ssr: false` — the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

/** The width a tile draws its picture at, per breakpoint: the same as a card in a list. */

const dexNumber = (n: number) => `#${String(n).padStart(3, "0")}`;

// A folder as a Pokédex: one tile per number, drawn as the same tile a list of cards uses, so
// the Pokédex reads as one of the folders and not as a different screen. A number you hold
// shows its card (several: a slider), its name and how many you have; one you do not is the
// same tile in grey, named, so a person knows what to find.
/** Slots drawn per batch: two to three screens on any width, the rest as the reader scrolls. */
const DEX_BATCH = 96;

export function DexGrid({ slots, size = "md", linked = true }: { slots: NamedDexSlot[]; size?: CardsSize; linked?: boolean }) {
    // A thousand slots is seven hundred pictures' markup, most of it below the fold: drawn a
    // batch at a time, a screen ahead of the sentinel, the way a list of cards is. The slots are
    // all in hand already, so a batch is a render and not a request.
    const [shown, setShown] = useState(DEX_BATCH);
    const sentinel = useRef<HTMLDivElement>(null);
    // The card a tile opens, in the same sheet a list opens one in. A slot carries its cards' ids and
    // names only; the sheet wants the whole row, so a tap asks the API for that card's rows (set and
    // number: the same call the sheet's Copies tile makes) and opens the one the tile showed, not a
    // search for its name, which would list every namesake.
    const [selected, setSelected] = useState<Card | null>(null);
    const opening = useRef<string | null>(null);
    const open = async (card: DexCard) => {
        if (opening.current === card.id) return;
        opening.current = card.id;
        try {
            const rows = await listCopies({ set: card.set, number: card.number, name: card.name });
            const row = rows.find((r) => r.id === card.id) ?? rows[0] ?? null;
            if (row) setSelected(row);
        } finally {
            opening.current = null;
        }
    };
    const more = shown < slots.length;
    useEffect(() => {
        const el = sentinel.current;
        if (!el || !more || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                observer.disconnect();
                setShown((n) => n + DEX_BATCH);
            },
            { rootMargin: "100% 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [more, shown]);
    return (
        <>
            <div className={cx("grid gap-4", GRID_COLUMNS[size])}>
                {slots.slice(0, shown).map((slot) => (
                    <DexTile key={slot.number} slot={slot} onSelect={linked ? open : undefined} />
                ))}
            </div>
            {more ? (
                <div ref={sentinel} className="flex justify-center py-2">
                    {/* The way on when the sentinel is never seen — a keyboard, or an observer the
                        browser does not have. The kit's quietest button: the same grey word it was. */}
                    <Button color="link-gray" size="sm" onClick={() => setShown((n) => n + DEX_BATCH)}>
                        Show more
                    </Button>
                </div>
            ) : null}
            {linked ? <CardDetailSlideout card={selected} onClose={() => setSelected(null)} /> : null}
        </>
    );
}

// `onSelect`: a card opens its sheet; on a public page there is nowhere to go, so the tile is a plain tile.
function DexTile({ slot, onSelect }: { slot: NamedDexSlot; onSelect?: (card: DexCard) => void }) {
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
            <CardTile
                picture={
                    <div className="flex aspect-card w-full items-center justify-center rounded-card bg-tertiary">
                        <span className="text-sm font-medium text-quaternary tabular-nums">{dexNumber(slot.number)}</span>
                    </div>
                }
                words={words}
            />
        );
    }

    // The slider is the press target here, one card at a time, so the tile around it is not one.
    if (held > 1) {
        return <CardTile picture={<DexSlider cards={slot.cards} onSelect={onSelect} />} words={words} />;
    }

    const card = slot.cards[0]!;
    const picture = (
        <div className={cx("relative aspect-card w-full overflow-hidden rounded-card", !card.imageUrl && "bg-quaternary")}>
            {card.imageUrl ? (
                <CardImage
                    src={card.imageHighUrl ?? card.imageUrl}
                    fallbackSrc={card.imageUrl}
                    width={TILE_WIDTH.md}
                    sizes={TILE_SIZES.md}
                    alt=""
                    quality={60}
                    className="object-cover"
                />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center">
                    <span className="line-clamp-4 text-sm font-medium text-secondary">{card.name}</span>
                </div>
            )}
        </div>
    );
    return <CardTile picture={picture} words={words} onSelect={onSelect ? () => onSelect(card) : undefined} />;
}

// The Pokédex body under the shared row: the View menu offers the size alone, a slot being
// neither a grid tile nor a table row. The row is drawn at once; the slots are a promise the
// page did not wait for, and show their outline until every card has been read.
export function DexView({
    dex,
    narrowed,
    initialSize = "md",
    listKey,
    toolbar,
    noHits,
    empty,
    linked = true,
}: {
    dex: Promise<DexList>;
    narrowed: boolean;
    initialSize?: CardsSize;
    /** The list's URL, keying the slots and nothing above them. See `CardsView`. */
    listKey?: string;
    toolbar?: ReactNode;
    /** Whether a tile leads into the owner's collection; not on a public page. */
    linked?: boolean;
    /** When a search or a filter finds nothing. */
    noHits: ReactNode;
    /** When the folder holds nothing at all. */
    empty: ReactNode;
}) {
    const [size, setSize] = useState(initialSize);
    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="contents">{toolbar}</div>
                <ViewMenu view="grid" size={size} onView={() => {}} onSize={setSize} layouts={false} />
            </div>
            <Suspense fallback={<CardsSkeleton />}>
                <DexSlots key={listKey} dex={dex} size={size} narrowed={narrowed} noHits={noHits} empty={empty} linked={linked} />
            </Suspense>
        </div>
    );
}

function DexSlots({
    dex,
    size,
    narrowed,
    noHits,
    empty,
    linked,
}: {
    dex: Promise<DexList>;
    size: CardsSize;
    narrowed: boolean;
    noHits: ReactNode;
    empty: ReactNode;
    linked: boolean;
}) {
    const d = use(dex);
    if (d.total === 0) return <div className="flex flex-1 flex-col">{narrowed ? noHits : empty}</div>;
    return <DexGrid slots={d.slots} size={size} linked={linked} />;
}
