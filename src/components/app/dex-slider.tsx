"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import type { DexCard } from "@/lib/api-shapes";
import { TILE_WIDTH } from "@/lib/cards-view";
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
                            // The same box as a one-card slot in the grid beside it (dex-grid.tsx), so the same
                            // hint: without it CardImage's default of 256 asked for the 640 rung for a 192 px
                            // tile, and a slot with five cards paid it five times. `fallbackSrc` keeps a
                            // catalogue that will not answer to the low scan rather than the 133 KB original.
                            <CardImage
                                src={card.imageHighUrl ?? card.imageUrl}
                                fallbackSrc={card.imageUrl}
                                width={TILE_WIDTH.md}
                                quality={60}
                                alt={card.name}
                                className="object-cover"
                            />
                        ) : (
                            /* Face down, and named: the slot's caption says the Pokémon, not which card this is. */
                            <CardBack width={TILE_WIDTH.md} alt={card.name} />
                        )}
                    </Slide>
                ))}
            </div>

            {/* The kit's icon button, which names itself after its tooltip, the same words the arrow
                was already labelled with. Its xs size is this circle exactly: a 16 px chevron in 6 px
                of padding. The black disc, the show-on-hover and the focus ring's own offset are this
                slider's: an offset ring is clipped by the picture box a pixel or two away. */}
            <ButtonUtility
                size="xs"
                color="tertiary"
                icon={ChevronLeft}
                tooltip="Previous card"
                tooltipPlacement="left"
                onClick={() => scroll(-1)}
                className="absolute top-1/2 left-1 hidden -translate-y-1/2 bg-alpha-black/60 text-alpha-white transition-none hover:bg-alpha-black/60 hover:text-alpha-white focus-visible:outline-offset-0 lg:group-focus-within:inline-flex lg:group-hover:inline-flex pointer-coarse:inline-flex"
            />
            <ButtonUtility
                size="xs"
                color="tertiary"
                icon={ChevronRight}
                tooltip="Next card"
                tooltipPlacement="right"
                onClick={() => scroll(1)}
                className="absolute top-1/2 right-1 hidden -translate-y-1/2 bg-alpha-black/60 text-alpha-white transition-none hover:bg-alpha-black/60 hover:text-alpha-white focus-visible:outline-offset-0 lg:group-focus-within:inline-flex lg:group-hover:inline-flex pointer-coarse:inline-flex"
            />
        </div>
    );
}

// A slide opens its card's sheet, or on a public page is a plain frame.
function Slide({ onSelect, children }: { onSelect?: () => void; children: React.ReactNode }) {
    const className = "relative size-full shrink-0 snap-start";
    return onSelect ? (
        <AriaButton onPress={onSelect} className={cx(className, "cursor-pointer outline-focus-ring focus-visible:outline-2")}>
            {children}
        </AriaButton>
    ) : (
        <div className={className}>{children}</div>
    );
}
