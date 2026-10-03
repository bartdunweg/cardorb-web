import type { CSSProperties } from "react";
import { CardImage } from "@/components/app/card-image";

/**
 * Cards from every era, from our own bucket: Base Set to Scarlet & Violet. Fixed, not read from
 * the API, so the landing page stays prerendered and a slow catalogue never empties the ring.
 */
const RING_CARDS = [
    "base/base1/4",
    "swsh/swsh7/215",
    "neo/neo1/9",
    "sv/sv03.5/199",
    "base/base1/2",
    "sm/sm12/236",
    "gym/gym2/2",
    "ex/ex13/100",
    "sv/sv08.5/161",
    "base/base1/15",
    "xy/xy12/11",
    "base/base3/4",
    "dp/dp1/1",
    "sv/sv04.5/234",
    "neo/neo2/5",
    "base/base1/58",
    "swsh/swsh8/245",
    "ex/ex3/100",
    "bw/bw1/114",
    "sv/sv02/203",
    "base/basep/1",
    "sm/sm115/68",
    "base/base1/16",
    "sv/sv03.5/151",
] as const;

const STEP = 360 / RING_CARDS.length;

// The landing hero's ring of cards (the owner's call, 2026-10-03, after getlayers' Carousel
// Spotlight): cards on the inside of a slowly turning drum, seen from its middle, so the one
// straight ahead is the furthest and passes behind the orb while the ones at the sides come
// close and leave the screen. Pure CSS 3D (globals.css, .card-ring), no script; reduced motion
// stops the turn and leaves the drum standing. Decoration only: hidden from a screen reader,
// and it takes no pointer, so nothing in the hero is harder to press for it.
export function CardRing({ className }: { className?: string }) {
    return (
        <div className={`card-ring pointer-events-none ${className ?? ""}`} aria-hidden>
            <div className="card-ring-drum">
                {RING_CARDS.map((path, i) => (
                    <div key={path} className="card-ring-card" style={{ "--card-angle": `${i * STEP}deg` } as CSSProperties}>
                        <CardImage
                            src={`https://images.cardorb.com/en/${path}/high.webp`}
                            fallbackSrc={`https://images.cardorb.com/en/${path}/low.webp`}
                            alt=""
                            width={256}
                            className="object-cover"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
