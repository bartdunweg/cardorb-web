"use client";

import { useEffect, useId, useState } from "react";
import { type PricePoint, cardPriceHistory } from "@/app/(app)/dashboard/cards/actions";
import { formatPrice } from "@/lib/format";
import { areaPath, linePath, pointsFor } from "@/lib/value-chart-math";
import { cx } from "@/utils/cx";

// A card's price over the last ninety days, under the price in its sheet: one small line in the
// direction's colour, and a sentence saying how much it moved. Asked for when the sheet opens,
// not when the page mounts. A reverse holo reads the foil price, the same rule as the price above.
// No axis and no table: the sentence carries the numbers, the line the shape.

const WIDTH = 320;
const HEIGHT = 56;
const dayYear = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });

export function PriceHistory({
    tcgId,
    holo = false,
    tall = false,
}: {
    tcgId: string;
    holo?: boolean;
    /** The price tab's size: twice the height. */ tall?: boolean;
}) {
    // Kept with the id it was read for, so a sheet reopened on another card shows that card's outline, not this one's line.
    const [loaded, setLoaded] = useState<{ tcgId: string; points: PricePoint[] } | null>(null);
    const points = loaded?.tcgId === tcgId ? loaded.points : null;
    const titleId = useId();

    useEffect(() => {
        let live = true;
        cardPriceHistory(tcgId).then((p) => {
            if (live) setLoaded({ tcgId, points: p });
        });
        return () => {
            live = false;
        };
    }, [tcgId]);

    if (points === null) return <div className="h-[calc(3.5rem+1.25rem+0.5rem)]" aria-hidden="true" />;

    const series = points
        .map((p) => ({ date: p.date, value: (holo ? p.holo : null) ?? p.market }))
        .filter((p): p is { date: string; value: number } => p.value != null);
    if (series.length < 2) return <p className="text-sm text-tertiary">No price history yet; a reading is taken every night.</p>;

    const first = series[0];
    const last = series[series.length - 1];
    const change = Math.round((last.value - first.value) * 100) / 100;
    const values = series.map((s) => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min || Math.abs(max) || 1) * 0.1;
    const frame = { width: WIDTH, height: HEIGHT, top: 4, right: 0, bottom: 0, left: 0 };
    const pts = pointsFor(values, frame, min - pad, max + pad);
    // The line's colour, as `color`: the fill under it is a gradient of currentColor.
    const tone = "text-fg-primary";
    const stroke = "stroke-fg-primary";
    const fadeId = `${titleId}-fade`;
    const said = `${change === 0 ? "Unchanged" : `${change > 0 ? "+" : "−"}${formatPrice(Math.abs(change))}`} since ${dayYear.format(new Date(`${first.date}T00:00:00`))}`;

    return (
        <figure className="flex flex-col gap-1" aria-labelledby={titleId}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={cx("w-full", tall ? "h-28" : "h-14")} preserveAspectRatio="none" aria-labelledby={titleId}>
                <title id={titleId}>{`Price over the last ${series.length} readings: ${formatPrice(first.value)} to ${formatPrice(last.value)}.`}</title>
                {/* The ground under the line: the line's own colour, faint at the line and nothing at the
                    bottom, so it reads as the line's shadow and not a block. */}
                <defs>
                    <linearGradient id={fadeId} x1={0} y1={0} x2={0} y2={1}>
                        <stop offset={0} stopColor="currentColor" stopOpacity={0.15} />
                        <stop offset={1} stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <path d={areaPath(pts, HEIGHT)} fill={`url(#${fadeId})`} className={tone} />
                <path
                    d={linePath(pts)}
                    className={stroke}
                    strokeWidth={2}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <figcaption
                className={cx("text-sm font-medium tabular-nums", change === 0 ? "text-tertiary" : change > 0 ? "text-success-primary" : "text-error-primary")}
            >
                {said}
            </figcaption>
        </figure>
    );
}
