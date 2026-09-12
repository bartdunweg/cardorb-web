"use client";

import { type ReactNode, Suspense, use, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { listCopies } from "@/app/(app)/dashboard/cards/actions";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { CardTile } from "@/components/app/card-tile";
import { DexSlider } from "@/components/app/dex-slider";
import { CardsSkeleton } from "@/components/app/skeletons";
import { ViewMenu } from "@/components/app/view-menu";
import { Button } from "@/components/base/buttons/button";
import type { DexCard } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { type CardsSize, GRID_COLUMNS, TILE_SIZES, TILE_WIDTH } from "@/lib/cards-view";
import type { DexGeneration, DexList, NamedDexSlot } from "@/lib/dex-groups";
import { formatCount } from "@/lib/format";
import { cx } from "@/utils/cx";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// grid is drawn long before anyone touches a tile. `ssr: false`: the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

/** The width a tile draws its picture at, per breakpoint: the same as a card in a list. */

const dexNumber = (n: number) => `#${String(n).padStart(3, "0")}`;

/**
 * The artwork in a missing slot: the tile's width less the box's padding, and the source is 120 px,
 * so nothing wider is ever worth asking the optimizer for. One `sizes` for every tile size: the
 * difference between them is smaller than the optimizer's own rungs at this end of the list.
 */
const ART_WIDTH = 128;
const ART_SIZES = "(min-width: 1280px) 128px, 20vw";

// A folder as a Pokédex: one tile per number, drawn as the same tile a list of cards uses, so
// the Pokédex reads as one of the folders and not as a different screen. A number you hold
// shows its card (several: a slider), its name and how many you have; one you do not is the
// same tile in grey, named, so a person knows what to find.
//
// The slots stand in chapters, one a generation, each under its own heading with its own "45 of
// 151" (the way a completion grid reads in Headspace or Skillshare), so progress shows per
// region and not only as one number over a thousand tiles. The chapter's count is the page's
// count cut at the generation's edges (`groupByDex`), no rule of its own.
/** Slots drawn per batch: two to three screens on any width, the rest as the reader scrolls. */
const DEX_BATCH = 96;

export function DexGrid({ generations, size = "md", linked = true }: { generations: DexGeneration[]; size?: CardsSize; linked?: boolean }) {
    // A thousand slots is seven hundred pictures' markup, most of it below the fold: drawn a
    // batch at a time, a screen ahead of the sentinel, the way a list of cards is. The slots are
    // all in hand already, so a batch is a render and not a request. The count runs on across
    // the chapters: a chapter the batch has not reached is not drawn, heading included.
    const [shown, setShown] = useState(DEX_BATCH);
    // Where each chapter starts in that count, and the whole.
    const starts = generations.map((_, i) => generations.slice(0, i).reduce((n, g) => n + g.slots.length, 0));
    const total = (starts[generations.length - 1] ?? 0) + (generations[generations.length - 1]?.slots.length ?? 0);
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
    const more = shown < total;
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
            {generations.map((gen, i) => {
                const start = starts[i]!;
                if (start >= shown) return null;
                const id = `dex-gen-${gen.from}`;
                return (
                    <section key={gen.from} aria-labelledby={id} className="flex flex-col gap-3">
                        {/* The count in the heading's own line, so a screen reader hears it with the name. */}
                        <div className="flex items-baseline justify-between gap-4">
                            <h2 id={id} className="text-lg font-semibold text-primary">
                                {gen.label}
                            </h2>
                            <p className="text-sm text-tertiary tabular-nums">
                                {formatCount(gen.caught)} of {formatCount(gen.total)}
                            </p>
                        </div>
                        <div className={cx("grid gap-4", GRID_COLUMNS[size])}>
                            {gen.slots.slice(0, shown - start).map((slot) => (
                                <DexTile key={slot.number} slot={slot} onSelect={linked ? open : undefined} />
                            ))}
                        </div>
                    </section>
                );
            })}
            {more ? (
                <div ref={sentinel} className="flex justify-center py-2">
                    {/* The way on when the sentinel is never seen: a keyboard, or an observer the
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

    // A missing slot shows the Pokémon itself, in grey: what to look for, drawn as not held. The
    // picture is the API's own copy of the official artwork, 120 px on a see-through ground, so it
    // is drawn square inside the card-shaped box and never stretched to fill it. Ratio "square":
    // a picture that will not load leaves the grey box, not a card back; a card back would say
    // "a card with no scan", and there is no card here. `alt=""`: the name is under the box. The
    // number stands in only where the API knew no picture.
    if (held === 0) {
        return (
            <CardTile
                picture={
                    <div className="flex aspect-card w-full items-center justify-center rounded-card bg-tertiary">
                        {slot.artwork ? (
                            <div className="relative aspect-square w-3/5">
                                <CardImage
                                    src={slot.artwork}
                                    alt=""
                                    width={ART_WIDTH}
                                    sizes={ART_SIZES}
                                    ratio="square"
                                    className="object-contain opacity-60 grayscale"
                                />
                            </div>
                        ) : (
                            <span className="text-sm font-medium text-quaternary tabular-nums">{dexNumber(slot.number)}</span>
                        )}
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
        <div className="relative aspect-card w-full overflow-hidden rounded-card">
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
                <CardBack width={TILE_WIDTH.md} sizes={TILE_SIZES.md} />
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
            <Suspense fallback={<CardsSkeleton heading />}>
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
    return <DexGrid generations={d.generations} size={size} linked={linked} />;
}
