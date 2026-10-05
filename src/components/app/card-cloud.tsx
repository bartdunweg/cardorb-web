"use client";

import { type CSSProperties, type RefObject, useEffect, useRef } from "react";
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

/** Cards in the air at once; each picture flies more than one lane. */
const COUNT = 64;
/** One card's flight from far behind the orb to past the viewer, in seconds. */
const TRAVEL = 16;
/** Where a card sets out and where it leaves, in radii from the orb's plane (toward the viewer is +). */
const FAR = -6;
const NEAR = 1.1;
/** How far the pointer leans the tunnel, in radians each way. */
const LEAN = 0.035;
/** The camera's distance in radii; the same number as `perspective` in globals.css (.card-cloud). */
const EYE = 1.5;

/** A stable scatter: the same cloud on the server, in the first frame and on every visit. */
const noise = (i: number, salt: number) => {
    const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return s - Math.floor(s);
};

const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

/**
 * Each card's lane: a direction round the axis (the golden angle, so none bunch up), a distance
 * from it that keeps the middle open, wider than tall as a screen is, how far along its flight
 * it is at the start, and its own lean.
 */
const LANES = Array.from({ length: COUNT }, (_, i) => {
    const turn = i * Math.PI * (3 - Math.sqrt(5)) + noise(i, 5);
    const reach = 0.45 + 0.7 * noise(i, 4);
    return {
        x: Math.cos(turn) * reach * 1.25,
        // Further down than up: the orb stands high on the page, so the screen reaches further below it.
        y: Math.sin(turn) * reach * (Math.sin(turn) > 0 ? 1.15 : 0.6),
        // Its own scatter, not the golden angle's: tied to the direction, every far card stood on one side.
        start: (noise(i, 6) + i / COUNT) % 1,
        lean: `rotateX(${((noise(i, 1) - 0.5) * 50).toFixed(1)}deg) rotateY(${((noise(i, 2) - 0.5) * 60).toFixed(1)}deg) rotateZ(${((noise(i, 3) - 0.5) * 36).toFixed(1)}deg)`,
    };
});

type Place = { x: number; y: number; z: number; opacity: number; order: number };

/** Where card i is `time` seconds in, with the tunnel leaned by the pointer, and how much it shows. */
function placeAt(i: number, time: number, sway: number, tilt: number): Place {
    const lane = LANES[i];
    const along = (lane.start + time / TRAVEL) % 1;
    const depth = FAR + along * (NEAR - FAR);
    const x = lane.x * Math.cos(sway) + depth * Math.sin(sway);
    const z = -lane.x * Math.sin(sway) + depth * Math.cos(sway);
    // Out of the page far away, into full colour on the way, gone before it fills the screen.
    const opacity = smooth(0, 0.3, along) * (1 - smooth(0.88, 0.98, along)) * (0.15 + 0.85 * smooth(FAR, FAR * 0.2, depth));
    return { x, y: lane.y * Math.cos(tilt) - z * Math.sin(tilt), z: lane.y * Math.sin(tilt) + z * Math.cos(tilt), opacity, order: Math.round(along * 1000) };
}

const cardStyle = (i: number, at: Place, opacity = at.opacity) =>
    ({
        "--x": at.x.toFixed(4),
        "--y": at.y.toFixed(4),
        "--z": at.z.toFixed(4),
        "--o": opacity.toFixed(3),
        "--lean": LANES[i].lean,
        zIndex: at.order,
    }) as CSSProperties;

type Box = { left: number; top: number; right: number; bottom: number };

/** How far a point is outside a box; 0 inside it. */
const outside = (x: number, y: number, b: Box) => Math.hypot(Math.max(b.left - x, 0, x - b.right), Math.max(b.top - y, 0, y - b.bottom));

function Cloud({ refs }: { refs: RefObject<(HTMLDivElement | null)[]> }) {
    return LANES.map((_, i) => (
        <div
            key={i}
            ref={(el) => {
                refs.current[i] = el;
            }}
            className="card-cloud-card"
            style={cardStyle(i, placeAt(i, 0, 0, 0))}
        >
            <CardImage
                src={`https://images.cardorb.com/en/${CLOUD_CARDS[i % CLOUD_CARDS.length]}/high.webp`}
                fallbackSrc={`https://images.cardorb.com/en/${CLOUD_CARDS[i % CLOUD_CARDS.length]}/low.webp`}
                alt=""
                width={192}
                className="object-cover"
            />
        </div>
    ));
}

type CardCloudProps = {
    className?: string;
};

// The landing hero's cloud of cards (the owner's call, 2026-10-05, after cosmos.so): a tunnel. Each
// card sets out small and pale far behind the orb, flies toward the viewer down its own lane round
// the axis, grows and fans out, and leaves past the screen's edge to start again; the middle stays
// open, and the words, the top bar and the footer are kept clear. While a card is far it is behind
// the ball and shows through it, magnified: inside the ball's circle a second cloud flies on the
// same clock (the lens, .card-cloud-lens). The places are worked out here and handed to CSS as
// numbers (--x, --y, --z in radii, --o), so the server draws the first frame and the script only
// moves it. Decoration only: hidden from a screen reader, and it takes no pointer.
// It keeps turning with no pause control, as the orb does (OrbMark; the owner's call, 2026-10-03):
// WCAG 2.2.2 asks for one past five seconds, and reduced motion is the only way to stop it. Do not
// add a stop or a button without asking. It sits in the box of the orb, which must be `relative`,
// inside an element marked `data-card-cloud` that holds the words, the header and the footer.
export function CardCloud({ className }: CardCloudProps) {
    const cloudRef = useRef<HTMLDivElement>(null);
    const lensRef = useRef<HTMLDivElement>(null);
    const cards = useRef<(HTMLDivElement | null)[]>([]);
    const lensCards = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const cloud = cloudRef.current;
        const root = cloud?.closest<HTMLElement>("[data-card-cloud]");
        const orb = cloud?.parentElement;
        if (!cloud || !root || !orb) return;
        // What stays clear: the words themselves, not the column they stand in (a heading is a block
        // as wide as the column), and what the top bar and the footer hold, not their whole width.
        const clear = ["[data-card-cloud-clear]", "header", "footer"].flatMap((selector) =>
            [...(root.querySelector(selector)?.children ?? [])].map((el) => {
                const range = document.createRange();
                range.selectNodeContents(el);
                return range;
            }),
        );

        // The layout, in px from the orb's middle; read again whenever the hero changes size.
        let radius = 0;
        let card = 0;
        let ball = 0;
        let keepClear: Box[] = [];
        const measure = () => {
            const o = orb.getBoundingClientRect();
            const cx = o.left + o.width / 2;
            const cy = o.top + o.height / 2;
            const style = getComputedStyle(cloud);
            radius = parseFloat(style.getPropertyValue("--card-cloud-radius")) || 600;
            card = parseFloat(style.getPropertyValue("--card-cloud-width")) || 96;
            // The ball is 62 percent of the orb's box (orb-glass.ts, SCENE_SPAN).
            ball = o.width * 0.309;
            keepClear = clear.map((range) => {
                const r = range.getBoundingClientRect();
                return { left: r.left - cx - 24, top: r.top - cy - 24, right: r.right - cx + 24, bottom: r.bottom - cy + 24 };
            });
        };

        const reduced = matchMedia("(prefers-reduced-motion: reduce)");
        let time = 0;
        let sway = 0;
        let tilt = 0;
        let goal: [number, number] = [0, 0];
        let last: number | null = null;
        let frame = 0;

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
                const scale = EYE / (EYE - at.z);
                const sx = at.x * radius * scale;
                const sy = at.y * radius * scale;
                const half = card * scale * 0.7;
                let opacity = at.opacity;
                // Words, bar and footer stay clear; a card fades as it nears them.
                for (const b of keepClear) opacity *= 0.04 + 0.96 * smooth(0, 110, outside(sx, sy, b) - half);
                // A card in front of the ball steps aside for it.
                if (at.z > 0) opacity *= smooth(ball * 0.9, ball * 1.9, Math.hypot(sx, sy) - half * 0.5);
                const style = cardStyle(i, at, opacity) as Record<string, string>;
                for (const el of [cards.current[i], lensCards.current[i]]) {
                    if (!el) continue;
                    for (const name of ["--x", "--y", "--z", "--o"]) el.style.setProperty(name, style[name]);
                    el.style.zIndex = String(at.order);
                }
            }
            // Shown once the words are kept clear, never before (globals.css).
            cloud.dataset.ready = "";
            if (lensRef.current) lensRef.current.dataset.ready = "";
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
        const resize = new ResizeObserver(() => {
            measure();
            schedule();
        });
        resize.observe(root);
        measure();
        schedule();
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        reduced.addEventListener("change", schedule);
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            window.removeEventListener("pointermove", onPointer);
            document.removeEventListener("visibilitychange", onVisibility);
            reduced.removeEventListener("change", schedule);
        };
    }, []);

    return (
        <>
            <div ref={cloudRef} className={cx("card-cloud pointer-events-none", className)} aria-hidden>
                <Cloud refs={cards} />
            </div>
            <div className={cx("card-cloud-lens pointer-events-none", className)} aria-hidden>
                <div ref={lensRef} className="card-cloud">
                    <Cloud refs={lensCards} />
                </div>
            </div>
        </>
    );
}
