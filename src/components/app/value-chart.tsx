"use client";

import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import { BarChart01 } from "@untitledui/icons";
import { formatCount, formatPrice } from "@/lib/format";
import { type Frame, areaPath, fullRange, linePath, nearestIndex, pointsFor } from "@/lib/value-chart-math";
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
 * and a tooltip with the date, the value and how many cards had no price. A reading on which cards
 * were added says in its tooltip how many and what they were worth: the step the line takes when a
 * collection grows, which a value alone does not explain. No ring on the line for it any more (Bart,
 * 2026-09-15): the line is one smooth stroke through the readings and the tooltip carries it. Arrow keys walk the
 * readings for a keyboard, and the description under the figure says first, last and the change,
 * so nothing is carried by the picture alone.
 */

const HEIGHT = 200;
/** The height the chart takes, for a placeholder to hold while the readings are on their way. */
export const CHART_HEIGHT = HEIGHT;
// No axis: the line fills the height from its lowest reading to its highest, and those two figures
// stand at the top left and the bottom left, always there, as a stocks app writes its range (Bart,
// 2026-09-15). The tooltip says any point and the description says them all. The three dates sit
// under the lowest figure.
/**
 * How thick the line is drawn, and half of that.
 *
 * The stroke sits centred on the reading, so half of it falls either side. With the frame flush to
 * the edges the first and last readings stood on x = 0 and x = width, and that outer half fell
 * outside the SVG's own viewport, which clips: both ends lost a pixel of their round cap and
 * finished in a flat chop. The frame keeps the pen's width inside, so a line ends the way it runs.
 */
export const STROKE = 2;
const PEN = STROKE / 2;
const FRAME: Omit<Frame, "width"> = { height: HEIGHT, top: 26, right: PEN, bottom: 44, left: PEN };

const day = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
const dayYear = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const dateOf = (s: ValueSnapshot) => new Date(`${s.date}T00:00:00`);
/** A reading's day, or its week where the chart shows one a week: "Jun 7 – 13, 2025". */
const whenOf = (s: ValueSnapshot) => (s.weekFrom ? dayYear.formatRange(new Date(`${s.weekFrom}T00:00:00`), dateOf(s)) : dayYear.format(dateOf(s)));

export function ValueChart({
    snapshots,
    label = "Collection value over time",
    countLabel = "cards",
    children,
    drawKey,
}: {
    snapshots: ValueSnapshot[];
    label?: string;
    /**
     * What `cards` counts in the tooltip, or null to leave the line out.
     *
     * A collection's reading is a sum over copies and says so. One card's price is a price, and
     * "1 copies" under it would be the chart still talking about a collection.
     */
    countLabel?: string | null;
    /** Under the chart, above the table: the period buttons. */
    children?: ReactNode;
    /**
     * What makes the line new, so it is drawn in again: by default the stretch shown. A card's price
     * line passes its card and period, so pressing another printing swaps the line without drawing it
     * in from the left each time (Bart, 2026-09-15: the switch felt heavy).
     */
    drawKey?: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [active, setActive] = useState<number | null>(null);
    const titleId = useId();
    const descId = useId();
    const svgTitleId = useId();

    // Measured from the moment the container exists, not from the first render: the card sheet
    // draws the empty state first and the readings arrive after, and an effect that ran once on
    // mount found no container to watch. The periods then appeared under a blank space, since
    // the SVG is drawn only at a measured width. A callback ref attaches when the node does.
    const measure = useCallback((el: HTMLDivElement | null) => {
        container.current = el;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (snapshots.length < 2) {
        /* The height the line would have taken, and an icon over the sentence. A chart that
           collapses to one line of text reads as a chart that failed to load, which is the wrong
           thing to say about a card that simply has not been priced twice yet. */
        return (
            <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight: HEIGHT }}>
                <BarChart01 aria-hidden="true" className="size-5 text-fg-quaternary" />
                <p className="text-sm text-tertiary">
                    {snapshots.length === 0
                        ? "No readings in this period yet; the line starts once there are two."
                        : `One reading so far, ${formatPrice(snapshots[0].value)} on ${whenOf(snapshots[0])}. The line starts tomorrow.`}
                </p>
            </div>
        );
    }

    const frame: Frame = { ...FRAME, width };
    const values = snapshots.map((s) => s.value);
    const [yMin, yMax] = fullRange(Math.min(...values), Math.max(...values));
    const days = snapshots.map((s) => s.date);
    // Where each reading is. The line, the hover dot and the tooltip all use these same points, every
    // reading and never a thinned subset: a line through fewer readings let the dot float off it and
    // could draw a day that fell as rising. The monotone curve cannot overshoot a reading, and a path
    // through a few hundred points is cheap.
    const points = width > 0 ? pointsFor(values, frame, yMin, yMax, days) : [];
    const baseline = frame.height - frame.bottom;
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const change = last.value - first.value;
    // The line is the page's own ink; the sentence beside it carries the direction and its colour.
    const fillTone = "fill-fg-primary";
    // The line's class sets the stroke only: a fill class would win over its fill="none".
    const strokeTone = "stroke-fg-primary";
    const fadeId = `${svgTitleId}-fade`;
    // Additions on the first reading came before what is shown, as the total above leaves them out.
    const addedAt = snapshots.map((s, i) => i > 0 && (s.added ?? 0) > 0);
    const addedValue = snapshots.reduce((sum, s, i) => sum + (addedAt[i] ? (s.addedValue ?? 0) : 0), 0);
    const addedDays = addedAt.filter(Boolean).length;
    // "1 card", "2 cards": the tooltip's count in its number (Bart, 2026-09-15: "cards", not "copies").
    const counted = (n: number) => (n === 1 && countLabel ? countLabel.replace(/s$/, "") : countLabel);
    /*
     * The highest and the lowest reading, written on the line (Bart, 2026-09-15): without them the
     * range was a hover away. The first of each where a figure repeats; one mark where the line is flat.
     */
    const high = values.indexOf(Math.max(...values));
    const low = values.indexOf(Math.min(...values));
    const extremes =
        snapshots[high].value === snapshots[low].value
            ? [{ i: high, kind: "high" as const }]
            : [
                  { i: high, kind: "high" as const },
                  { i: low, kind: "low" as const },
              ];
    const summary = `${formatPrice(first.value)} on ${whenOf(first)} to ${formatPrice(last.value)} on ${whenOf(last)}, ${
        change === 0 ? "unchanged" : `${change > 0 ? "up" : "down"} ${formatPrice(Math.abs(change))}`
    }.${extremes.length > 1 ? ` Highest ${formatPrice(snapshots[high].value)} on ${whenOf(snapshots[high])}, lowest ${formatPrice(snapshots[low].value)} on ${whenOf(snapshots[low])}.` : ""}${addedDays ? ` Cards were added on ${formatCount(addedDays)} ${addedDays === 1 ? "reading" : "readings"}, worth ${formatPrice(addedValue)} then.` : ""}`;

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

            <div ref={measure} className="relative w-full" style={{ height: HEIGHT }}>
                {width > 0 ? (
                    <svg
                        width={width}
                        height={HEIGHT}
                        aria-labelledby={svgTitleId}
                        aria-describedby={descId}
                        tabIndex={0}
                        // outline-hidden, or Safari draws its own light-blue ring the moment the chart
                        // is clicked: our ring is set at focus-visible only, and a plain click focus
                        // left the element with no outline of ours for the browser to replace.
                        //
                        // outline-solid is not decoration. outline-hidden sets --tw-outline-style to
                        // none, and outline-2 only sets the width from that variable, so without it
                        // the keyboard ring is 2px of nothing, measured. The kit gets away with a
                        // bare outline-hidden because its focus indicator is a ring, not an outline.
                        className="block rounded-md outline-hidden outline-focus-ring focus-visible:outline-2 focus-visible:outline-solid"
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
                        {/* Drawn left to right, once, when the line is new: on the tab opening, and on a
                            period that shows another stretch of it. Keyed on the ends of what is shown, so
                            a hover or a resize does not draw it again; a period change does. The group is
                            revealed, not the path's dash, so the ground under the line follows the pen. */}
                        <g key={drawKey ?? `${first.date}/${last.date}`} className="chart-draw">
                            {/* One unbroken line through every stretch, readings or none (Bart, 2026-09-15: the
                                dotted stretch said nothing a flat line does not). */}
                            <path d={areaPath(points, baseline)} fill={`url(#${fadeId})`} className="text-fg-primary" />
                            <path d={linePath(points)} className={strokeTone} strokeWidth={STROKE} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                        </g>

                        {/* The highest figure over the line's top, the lowest under its foot, both at the left edge:
                            the same place on every chart, so the scale reads at a glance. Hidden from a screen
                            reader, which has them in the description. */}
                        {points.length
                            ? extremes.map(({ i, kind }) => (
                                  <text
                                      key={kind}
                                      data-extreme={kind}
                                      aria-hidden="true"
                                      x={0}
                                      y={kind === "high" ? frame.top - 10 : baseline + 16}
                                      textAnchor="start"
                                      className="fill-text-secondary text-xs font-medium tabular-nums"
                                  >
                                      {formatPrice(snapshots[i].value)}
                                  </text>
                              ))
                            : null}

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
                        <span className="font-medium text-secondary">{whenOf(current)}</span>
                        <span className="text-sm font-semibold text-primary tabular-nums">
                            {formatPrice(current.value)}
                            {/* A week in Max is the average of its days (byWeek), and the reading says so. */}
                            {current.weekFrom ? <span className="font-normal text-tertiary"> average</span> : null}
                        </span>
                        {countLabel ? (
                            <span className="text-tertiary tabular-nums">
                                {formatCount(current.cards)} {counted(current.cards)}
                                {current.unpriced > 0 ? ` · ${formatCount(current.unpriced)} without a price` : ""}
                            </span>
                        ) : null}
                        {countLabel && active !== null && addedAt[active] ? (
                            <span className="text-tertiary tabular-nums">
                                +{formatCount(current.added ?? 0)} {counted(current.added ?? 0)} added, worth {formatPrice(current.addedValue ?? 0)}
                            </span>
                        ) : null}
                    </output>
                ) : null}
            </div>

            {children}
        </figure>
    );
}
