"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { cx } from "@/utils/cx";

/**
 * Cards from every era, from our own bucket: Base Set to Scarlet & Violet. Fixed, not read from
 * the API, so the landing page stays prerendered and a slow catalogue never empties the cloud.
 */
const CLOUD_CARDS = [
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
    "base/base2/1",
    "neo/neo3/1",
    "ex/ex6/100",
    "hgss/hgss1/1",
    "xy/xy1/1",
    "base/base3/15",
    "gym/gym1/1",
    "ex/ex9/104",
    "pl/pl1/1",
    "bw/bw5/1",
    "sm/sm1/1",
    "swsh/swsh4/188",
    "base/base2/7",
    "neo/neo4/107",
    "ex/ex16/101",
    "dp/dp3/1",
    "xy/xy7/1",
    "sm/sm9/1",
    "swsh/swsh1/1",
    "base/base4/1",
] as const;

/**
 * The ring round the orb, as Saturn's: two bands, inside out, each with how many cards it holds,
 * its size (in radii, from the orb's middle) and the seconds one turn takes. The cards stand up
 * on it, faces out, so the front of the ring shows their pictures and the back their backs.
 */
const BANDS = [
    { count: 18, reach: 0.72, period: 40 },
    { count: 24, reach: 0.92, period: 52 },
] as const;
/**
 * How far the ring is tipped, in radians: seen a little from below, so its front passes over the
 * orb, where there is room, and its back under it, behind the ball and into the veil at the title.
 */
const TIP = -0.32;
/** How far the pointer turns and tips the ring, in radians each way. */
const LEAN = 0.06;

/** Each card's place, in order: evenly round its band, the outer band half a step turned. */
const LANES = BANDS.flatMap((band, b) => Array.from({ length: band.count }, (_, k) => ({ band: b, turn: ((k + b * 0.5) * 2 * Math.PI) / band.count })));
const COUNT = LANES.length;

type Place = { x: number; y: number; z: number; lean: string };

/** Where card i stands `time` seconds in, with the ring turned by `sway` and tipped by `tilt`. */
function placeAt(i: number, time: number, sway: number, tilt: number): Place {
    const lane = LANES[i];
    const band = BANDS[lane.band];
    const turn = lane.turn + (time / band.period) * 2 * Math.PI + sway;
    const tip = TIP + tilt;
    const toward = Math.sin(turn) * band.reach;
    return {
        x: Math.cos(turn) * band.reach,
        y: toward * Math.sin(tip),
        z: toward * Math.cos(tip),
        // Upright on the tipped ring, its face turned out from the orb.
        lean: `rotateX(${((-tip * 180) / Math.PI).toFixed(2)}deg) rotateY(${(90 - (turn * 180) / Math.PI).toFixed(2)}deg)`,
    };
}

/** Nearer cards over further ones: the cards are drawn flat, one by one, so the order is ours to set. */
const depthOrder = (z: number) => Math.round(z * 1000) + 2000;

const cardStyle = (at: Place) =>
    ({
        "--x": at.x.toFixed(4),
        "--y": at.y.toFixed(4),
        "--z": at.z.toFixed(4),
        "--lean": at.lean,
        zIndex: depthOrder(at.z),
    }) as CSSProperties;

type CardCloudProps = {
    className?: string;
};

// The landing hero's ring of cards (the owner's calls, 2026-10-05, after cosmos.so): a ring round
// the orb as Saturn's, two bands of cards standing on it, turning. Seen a little from below, the
// front of the ring passes over the orb with the cards' pictures, the sides show them edge on and
// the back passes under the orb with their backs (the official back, public/card-back.jpg),
// behind the ball and into the veil where the title begins (.card-cloud-veil, in the hero). The
// places are worked out here and handed to CSS as numbers (--x, --y, --z in radii, --lean), so
// the server draws the first frame and the script only moves it. Decoration only: hidden from a
// screen reader, and it takes no pointer.
// It keeps moving with no pause control, as the orb does (OrbMark; the owner's call, 2026-10-03):
// WCAG 2.2.2 asks for one past five seconds, and reduced motion is the only way to stop it. Do not
// add a stop or a button without asking. It sits in the box of the orb, which must be `relative`.
export function CardCloud({ className }: CardCloudProps) {
    const cards = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const reduced = matchMedia("(prefers-reduced-motion: reduce)");
        let time = 0;
        let sway = 0;
        let tilt = 0;
        let goal: [number, number] = [0, 0];
        let last: number | null = null;
        let frame = 0;
        const order = LANES.map((_, i) => depthOrder(placeAt(i, 0, 0, 0).z));

        const draw = (now: number) => {
            frame = 0;
            const step = last === null ? 0 : Math.min((now - last) / 1000, 1 / 30);
            last = now;
            if (!reduced.matches) {
                time += step;
                const ease = 1 - Math.exp(-step * 2.5);
                sway += (goal[0] - sway) * ease;
                tilt += (goal[1] - tilt) * ease;
            }
            for (let i = 0; i < COUNT; i++) {
                const at = placeAt(i, time, sway, tilt);
                const el = cards.current[i];
                if (!el) continue;
                el.style.setProperty("--x", at.x.toFixed(4));
                el.style.setProperty("--y", at.y.toFixed(4));
                el.style.setProperty("--z", at.z.toFixed(4));
                el.style.setProperty("--lean", at.lean);
                const z = depthOrder(at.z);
                if (z !== order[i]) {
                    order[i] = z;
                    el.style.zIndex = String(z);
                }
            }
            if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(draw);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(draw);
        };

        const onPointer = (event: PointerEvent) => {
            if (reduced.matches) return;
            goal = [(event.clientX / innerWidth - 0.5) * 2 * LEAN, (event.clientY / innerHeight - 0.5) * 2 * LEAN];
        };
        const onVisibility = () => {
            last = null;
            if (!document.hidden) schedule();
        };
        schedule();
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        reduced.addEventListener("change", schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onPointer);
            document.removeEventListener("visibilitychange", onVisibility);
            reduced.removeEventListener("change", schedule);
        };
    }, []);

    return (
        <div className={cx("card-cloud pointer-events-none", className)} aria-hidden>
            {LANES.map((_, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        cards.current[i] = el;
                    }}
                    className="card-cloud-card"
                    style={cardStyle(placeAt(i, 0, 0, 0))}
                >
                    <div className="card-cloud-face">
                        <CardImage
                            src={`https://images.cardorb.com/en/${CLOUD_CARDS[i % CLOUD_CARDS.length]}/high.webp`}
                            fallbackSrc={`https://images.cardorb.com/en/${CLOUD_CARDS[i % CLOUD_CARDS.length]}/low.webp`}
                            alt=""
                            width={192}
                            className="object-cover"
                        />
                    </div>
                    <div className="card-cloud-face card-cloud-back">
                        <CardBack width={192} />
                    </div>
                </div>
            ))}
        </div>
    );
}
