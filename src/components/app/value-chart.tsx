"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { type Frame, areaPath, linePath, nearestIndex, niceTicks, pointsFor } from "@/lib/value-chart-math";
import type { ValueSnapshot } from "@/lib/value-history";
import { cx } from "@/utils/cx";

/**
 * What the collection has been worth, night by night: one line, no legend, the title names it.
 *
 * Hand-drawn SVG rather than a chart library: a single series with a hover layer is two hundred
 * lines, and the smallest library that draws it weighs more than the rest of Home's JavaScript.
 *
 * The line is the brand colour at 2 px with a faint fill under it; the grid and axis text stay
 * recessive. Hovering or focusing finds the nearest reading and shows a crosshair, an 8 px marker
 * and a tooltip with the date, the value and how many copies had no price. Arrow keys walk the
 * readings for a keyboard, and the description under the figure says first, last and the change,
 * so nothing is carried by the picture alone.
 */

const HEIGHT = 200;
// No axis: the number above the chart says the scale, the tooltip says any point, and the table
// says them all. The line runs edge to edge, the three dates sit under it.
const FRAME: Omit<Frame, "width"> = { height: HEIGHT, top: 12, right: 0, bottom: 28, left: 0 };

const day = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
const dayYear = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const dateOf = (s: ValueSnapshot) => new Date(`${s.date}T00:00:00`);

export function ValueChart({
    snapshots,
    label = "Collection value over time",
    children,
}: {
    snapshots: ValueSnapshot[];
    label?: string;
    /** Under the chart, above the table: the period buttons. */
    children?: ReactNode;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [active, setActive] = useState<number | null>(null);
    const titleId = useId();
    const descId = useId();
    const svgTitleId = useId();

    useEffect(() => {
        const el = container.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (snapshots.length < 2) {
        return (
            <p className="flex items-center text-sm text-tertiary" style={{ minHeight: HEIGHT }}>
                {snapshots.length === 0
                    ? "No readings in this period yet; the line starts once there are two."
                    : `One reading so far, ${formatPrice(snapshots[0].value)} on ${dayYear.format(dateOf(snapshots[0]))}. The line starts tomorrow.`}
            </p>
        );
    }

    const frame: Frame = { ...FRAME, width };
    const values = snapshots.map((s) => s.value);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const points = width > 0 ? pointsFor(values, frame, yMin, yMax) : [];
    const baseline = frame.height - frame.bottom;
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const change = last.value - first.value;
    // The line is the page's own ink; the sentence beside it carries the direction and its colour.
    const fillTone = "fill-fg-primary";
    // The line's class sets the stroke only: a fill class would win over its fill="none".
    const strokeTone = "stroke-fg-primary";
    const fadeId = `${svgTitleId}-fade`;
    const summary = `${formatPrice(first.value)} on ${dayYear.format(dateOf(first))} to ${formatPrice(last.value)} on ${dayYear.format(dateOf(last))}, ${
        change === 0 ? "unchanged" : `${change > 0 ? "up" : "down"} ${formatPrice(Math.abs(change))}`
    }.`;

    // Three date labels: first, middle, last. More would collide on a phone.
    const labelled = new Set([0, Math.floor((snapshots.length - 1) / 2), snapshots.length - 1]);

    const pick = (clientX: number) => {
        const el = container.current;
        if (!el || points.length === 0) return;
        setActive(nearestIndex(points, clientX - el.getBoundingClientRect().left));
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const step = e.key === "ArrowRight" ? 1 : -1;
            setActive((a) => Math.min(snapshots.length - 1, Math.max(0, (a ?? (step > 0 ? -1 : snapshots.length)) + step)));
        } else if (e.key === "Home") setActive(0);
        else if (e.key === "End") setActive(snapshots.length - 1);
        else if (e.key === "Escape") setActive(null);
    };

    const current = active !== null ? snapshots[active] : null;
    const currentPoint = active !== null ? points[active] : null;
    // The tooltip sits beside the marker, flipping sides near the right edge so it never leaves the frame.
    const tooltipLeft = currentPoint ? (currentPoint.x > width * 0.6 ? undefined : currentPoint.x + 12) : undefined;
    const tooltipRight = currentPoint && currentPoint.x > width * 0.6 ? width - currentPoint.x + 12 : undefined;

    return (
        <figure className="flex flex-col gap-3" aria-labelledby={titleId} aria-describedby={descId}>
            <figcaption id={titleId} className="sr-only">
                {label}
            </figcaption>
            <p id={descId} className="sr-only">
                {summary}
            </p>

            <div ref={container} className="relative w-full" style={{ height: HEIGHT }}>
                {width > 0 ? (
                    <svg
                        width={width}
                        height={HEIGHT}
                        aria-labelledby={svgTitleId}
                        aria-describedby={descId}
                        tabIndex={0}
                        // outline-hidden, or Safari draws its own light-blue ring the moment the chart
                        // is clicked: the app's ring is set at focus-visible only, and a plain
                        // click focus left the element with no outline of ours for the browser to
                        // replace. Same guard the kit puts on its select and its inputs.
                        className="block rounded-md outline-hidden outline-focus-ring focus-visible:outline-2"
                        onMouseMove={(e) => pick(e.clientX)}
                        onMouseLeave={() => setActive(null)}
                        onTouchStart={(e) => pick(e.touches[0].clientX)}
                        onTouchMove={(e) => pick(e.touches[0].clientX)}
                        onKeyDown={onKeyDown}
                        onBlur={() => setActive(null)}
                    >
                        <title id={svgTitleId}>{label}. Use the arrow keys to step through the readings.</title>
                        {/* One hairline where the line lands: the baseline the dates hang from. */}
                        <line x1={0} x2={width} y1={baseline} y2={baseline} className="stroke-border-secondary" strokeWidth={1} />

                        {snapshots.map((s, i) =>
                            labelled.has(i) ? (
                                <text
                                    key={s.date}
                                    x={points[i].x}
                                    y={HEIGHT - 8}
                                    textAnchor={i === 0 ? "start" : i === snapshots.length - 1 ? "end" : "middle"}
                                    className="fill-text-quaternary text-2xs"
                                >
                                    {day.format(dateOf(s))}
                                </text>
                            ) : null,
                        )}

                        {/* The ground under the line: its own colour, faint at the line and nothing at the baseline. */}
                        <defs>
                            <linearGradient id={fadeId} x1={0} y1={0} x2={0} y2={1}>
                                <stop offset={0} stopColor="currentColor" stopOpacity={0.15} />
                                <stop offset={1} stopColor="currentColor" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <path d={areaPath(points, baseline)} fill={`url(#${fadeId})`} className="text-fg-primary" />
                        <path d={linePath(points)} className={strokeTone} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

                        {currentPoint ? (
                            <g aria-hidden="true">
                                <line x1={currentPoint.x} x2={currentPoint.x} y1={frame.top} y2={baseline} className="stroke-border-primary" strokeWidth={1} />
                                <circle cx={currentPoint.x} cy={currentPoint.y} r={5} className={cx(fillTone, "stroke-bg-primary")} strokeWidth={2} />
                            </g>
                        ) : null}
                    </svg>
                ) : null}

                {current ? (
                    <output
                        aria-live="polite"
                        className="pointer-events-none absolute top-2 flex flex-col gap-0.5 rounded-lg bg-primary px-3 py-2 text-xs shadow-lg"
                        style={{ left: tooltipLeft, right: tooltipRight }}
                    >
                        <span className="font-medium text-secondary">{dayYear.format(dateOf(current))}</span>
                        <span className="text-sm font-semibold text-primary tabular-nums">{formatPrice(current.value)}</span>
                        <span className="text-tertiary tabular-nums">
                            {current.cards.toLocaleString("en-US")} copies
                            {current.unpriced > 0 ? ` · ${current.unpriced.toLocaleString("en-US")} without a price` : ""}
                        </span>
                    </output>
                ) : null}
            </div>

            {children}
        </figure>
    );
}
