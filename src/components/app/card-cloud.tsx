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

/**
 * The orbits round the orb, inside out: how many cards each holds, its size (in radii, across;
 * wider than tall as a screen is), how far back it lies (toward the viewer is +), and the seconds
 * one turn takes. The inner ones lie further back and turn faster, as orbits do.
 */
const ORBITS = [
    { count: 10, reach: 0.4, depth: -0.6, period: 40 },
    { count: 14, reach: 0.56, depth: -0.3, period: 55 },
    { count: 18, reach: 0.72, depth: 0.15, period: 70 },
] as const;
/** How far the pointer leans the orbits, in radians each way. */
const LEAN = 0.035;
/** The camera's distance in radii; the same number as `perspective` in globals.css (.card-cloud). */
const EYE = 1.5;
/** How far a card turns its face toward the orb, in degrees. */
const WALL = 22;

const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

/**
 * Each card's place, in order, not at random (the owner's call: tidy, not a scatter): evenly
 * round its orbit, every orbit half a step turned from the one inside it.
 */
const LANES = ORBITS.flatMap((orbit, o) =>
    Array.from({ length: orbit.count }, (_, k) => ({ orbit: o, turn: ((k + (o % 2) * 0.5) * 2 * Math.PI) / orbit.count })),
);
const COUNT = LANES.length;

type Place = { x: number; y: number; z: number; opacity: number; order: number; lean: string };

/**
 * Where card i is `time` seconds in, with the orbits leaned by the pointer. Each card faces the
 * viewer, turned a little toward the orb by its place on the orbit.
 */
function placeAt(i: number, time: number, sway: number, tilt: number): Place {
    const lane = LANES[i];
    const orbit = ORBITS[lane.orbit];
    const turn = lane.turn + (time / orbit.period) * 2 * Math.PI;
    const lx = Math.cos(turn) * orbit.reach * 1.25;
    const ly = Math.sin(turn) * orbit.reach * 0.85;
    const lean = `rotateX(${(-Math.sin(turn) * WALL).toFixed(1)}deg) rotateY(${(Math.cos(turn) * WALL).toFixed(1)}deg)`;
    const x = lx * Math.cos(sway) + orbit.depth * Math.sin(sway);
    const z = -lx * Math.sin(sway) + orbit.depth * Math.cos(sway);
    return { x, y: ly * Math.cos(tilt) - z * Math.sin(tilt), z: ly * Math.sin(tilt) + z * Math.cos(tilt), opacity: 1, order: lane.orbit, lean };
}

const cardStyle = (at: Place, opacity = at.opacity) =>
    ({
        "--x": at.x.toFixed(4),
        "--y": at.y.toFixed(4),
        "--z": at.z.toFixed(4),
        "--o": opacity.toFixed(3),
        "--lean": at.lean,
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
            style={cardStyle(placeAt(i, 0, 0, 0))}
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

// The landing hero's cloud of cards (the owner's call, 2026-10-05, after cosmos.so): three orbits
// of cards turning round the orb, in order, the inner ones further back and faster. Nothing shows
// behind the ball itself, and the cloud stays at the top of the page: a card fades before it
// reaches the words, and the top bar's contents stay clear. The places are worked out here and
// handed to CSS as numbers (--x, --y, --z in radii, --o, --lean), so the server draws the first
// frame and the script only moves it. Decoration only: hidden from a screen reader, and it takes
// no pointer.
// It keeps moving with no pause control, as the orb does (OrbMark; the owner's call, 2026-10-03):
// WCAG 2.2.2 asks for one past five seconds, and reduced motion is the only way to stop it. Do not
// add a stop or a button without asking. It sits in the box of the orb, which must be `relative`,
// inside an element marked `data-card-cloud` that holds the header and the words (`data-card-cloud-clear`).
export function CardCloud({ className }: CardCloudProps) {
    const cloudRef = useRef<HTMLDivElement>(null);
    const cards = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const cloud = cloudRef.current;
        const root = cloud?.closest<HTMLElement>("[data-card-cloud]");
        const orb = cloud?.parentElement;
        if (!cloud || !root || !orb) return;
        // What stays clear: the words themselves, not the column they stand in (a heading is a block
        // as wide as the column), and what the top bar and the footer hold, not their whole width.
        const words = root.querySelector("[data-card-cloud-clear]");
        const clear = ["header"].flatMap((selector) =>
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
        let floor = Infinity;
        const measure = () => {
            const o = orb.getBoundingClientRect();
            const midX = o.left + o.width / 2;
            const midY = o.top + o.height / 2;
            const style = getComputedStyle(cloud);
            radius = parseFloat(style.getPropertyValue("--card-cloud-radius")) || 600;
            card = parseFloat(style.getPropertyValue("--card-cloud-width")) || 96;
            // The ball is 62 percent of the orb's box (orb-glass.ts, SCENE_SPAN).
            ball = o.width * 0.309;
            keepClear = clear.map((range) => {
                const r = range.getBoundingClientRect();
                return { left: r.left - midX - 24, top: r.top - midY - 24, right: r.right - midX + 24, bottom: r.bottom - midY + 24 };
            });
            floor = words ? words.getBoundingClientRect().top - midY - 16 : Infinity;
        };

        const reduced = matchMedia("(prefers-reduced-motion: reduce)");
        let time = 0;
        let sway = 0;
        let tilt = 0;
        let goal: [number, number] = [0, 0];
        let last: number | null = null;
        let frame = 0;
        let shown = false;

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
                // The cloud belongs to the top of the page, round the orb (the owner's call): a card is
                // gone before it reaches the words.
                opacity *= smooth(0, 90, floor - sy - half);
                // Nothing shows behind the ball (the owner's call): a card comes into view round its edge.
                opacity *= smooth(ball, ball * 1.5, Math.hypot(sx, sy) - half);
                const style = cardStyle(at, opacity) as Record<string, string>;
                const el = cards.current[i];
                if (!el) continue;
                for (const name of ["--x", "--y", "--z", "--o", "--lean"]) el.style.setProperty(name, style[name]);
            }
            // Shown once the words are kept clear, never before (globals.css).
            if (!shown) {
                shown = true;
                cloud.dataset.ready = "";
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
        const resize = new ResizeObserver(() => {
            measure();
            schedule();
        });
        // The orb and the words move without the page changing size (a font arriving, a line breaking anew).
        resize.observe(root);
        resize.observe(orb);
        if (words) resize.observe(words);
        let gone = false;
        void document.fonts.ready.then(() => {
            if (gone) return;
            measure();
            schedule();
        });
        measure();
        schedule();
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        reduced.addEventListener("change", schedule);
        return () => {
            gone = true;
            cancelAnimationFrame(frame);
            resize.disconnect();
            window.removeEventListener("pointermove", onPointer);
            document.removeEventListener("visibilitychange", onVisibility);
            reduced.removeEventListener("change", schedule);
        };
    }, []);

    return (
        <div ref={cloudRef} className={cx("card-cloud pointer-events-none", className)} aria-hidden>
            <Cloud refs={cards} />
        </div>
    );
}
