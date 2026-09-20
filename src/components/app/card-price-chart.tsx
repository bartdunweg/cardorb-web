"use client";

import { useEffect, useState } from "react";
import { BarChart01 } from "@untitledui/icons";
import type { PricePoint } from "@/app/(app)/dashboard/cards/actions";
import { forgetPriceHistory, knownPriceHistory, preloadPriceHistory, priceHistoryFailed } from "@/components/app/card-memo";
import { ChartPeriods, type PeriodKey, forChart } from "@/components/app/chart-periods";
import { CHART_HEIGHT, ValueChart } from "@/components/app/value-chart";
import { Button } from "@/components/base/buttons/button";
import { chartLine, printingsOfLine } from "@/lib/price-change";
import type { ValueSnapshot } from "@/lib/value-history";

/**
 * One card's price over time, the same chart Home draws for the whole collection.
 *
 * It was a 320×56 sparkline with no axis, no scrubbing and no periods: a shape, not a reading.
 * The collection's chart already had all three, so the card gets that one rather than a second
 * one grown to look like it. `ValueChart` takes `ValueSnapshot`, whose `cards` counts copies, so
 * the tooltip's count line is turned off here: one card's price is a price, not a sum.
 *
 * The API answers with every reading it has, so the periods are a filter over what is already in
 * hand rather than a new request each time.
 */
export function CardPriceChart({
    tcgId,
    holo = false,
    name,
    printing = null,
    period,
    onPeriod,
}: {
    tcgId: string;
    holo?: boolean;
    name?: string | null;
    /**
     * The TCGplayer printing the sheet shows ("reverse-holofoil"): the copy's own, or the print run
     * chosen in the sheet's tabs. The chart has no switcher of its own; it chooses the period only.
     */
    printing?: string | null;
    /**
     * The period, where the sheet around the chart holds it: the figure beside the price reads the
     * same window, so the two cannot say different things about one card (Bart, 2026-09-16).
     */
    period: PeriodKey;
    onPeriod: (period: PeriodKey) => void;
}) {
    // Kept with the id it was read for, so a sheet reopened on another card never shows this one's line.
    const [loaded, setLoaded] = useState<{ tcgId: string; points: PricePoint[] } | null>(null);
    /** Try again: the line is forgotten and the effect below runs once more. */
    const [attempt, setAttempt] = useState(0);
    // What was fetched, or what an earlier open already learned. Derived, so a known line needs
    // no effect and no second render to show.
    const points = loaded?.tcgId === tcgId ? loaded.points : (knownPriceHistory(tcgId) ?? null);

    // Asked on every open: a fresh known line answers at once, an older one is drawn while the line
    // is read again, and the new day's point joins it when the answer lands.
    useEffect(() => {
        let live = true;
        preloadPriceHistory(tcgId).then((p) => {
            if (live) setLoaded({ tcgId, points: p });
        });
        return () => {
            live = false;
        };
    }, [tcgId, attempt]);

    // Still on its way: the height the line will take, and nothing said. "No readings" is an
    // answer, and this is not one yet.
    if (points === null) return <div aria-busy="true" style={{ height: CHART_HEIGHT }} />;

    /* The read did not answer and there is nothing known to draw. "No readings in this period yet"
       would be the app saying something about the card that is not true (error-path audit): the
       line is unknown, not absent, so it says that and offers the one thing that can change it. */
    if (!points.length && priceHistoryFailed(tcgId)) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: CHART_HEIGHT }}>
                <BarChart01 aria-hidden="true" className="size-5 text-fg-quaternary" />
                <p className="text-sm text-tertiary">The price history for this card could not be loaded.</p>
                <Button
                    size="sm"
                    color="secondary"
                    onClick={() => {
                        forgetPriceHistory(tcgId);
                        setLoaded(null);
                        setAttempt((n) => n + 1);
                    }}
                >
                    Try again
                </Button>
            </div>
        );
    }

    /*
     * One printing's line, never two: the one the sheet shows, whose price is the one above. A card
     * read as one line of "the price"
     * mixed printings on days one was missing, and a reverse or a 1st Edition copy drew the plain
     * card's line under its own price (pricing audit, 2026-09-14). Without printings in the answer,
     * the plain line, or the foil for a reverse copy.
     */
    const printings = printingsOfLine(points);
    const own = printing && printings.some((p) => p.key === printing) ? printing : null;
    const series: ValueSnapshot[] = chartLine(points, own, holo).map((p) => ({ ...p, cards: 1, priced: 1, unpriced: 0 }));

    const shown = forChart(series, period);
    const label = printings.find((p) => p.key === own)?.label;

    return (
        <ValueChart
            snapshots={shown}
            label={`${name ?? "This card"}${label ? ` ${label}` : ""}'s price over time`}
            countLabel={null}
            drawKey={`${tcgId}/${period}`}
        >
            {/* Only where there is more than one period to choose between: a card with a fortnight of
                readings has nothing to say about six months, and five buttons that all draw the same
                line are five ways to learn nothing. */}
            {series.length > 1 ? <ChartPeriods period={period} onPick={onPeriod} /> : null}
        </ValueChart>
    );
}
