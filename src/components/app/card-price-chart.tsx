"use client";

import { useEffect, useState } from "react";
import type { PricePoint } from "@/app/(app)/dashboard/cards/actions";
import { knownPriceHistory, preloadPriceHistory } from "@/components/app/card-memo";
import { ChartPeriods, ChartPrintings, type PeriodKey, forChart } from "@/components/app/chart-periods";
import { CHART_HEIGHT, ValueChart } from "@/components/app/value-chart";
import { printingsOfLine, valueOf } from "@/lib/price-change";
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
}: {
    tcgId: string;
    holo?: boolean;
    name?: string | null;
    /** The TCGplayer printing the copy is priced as ("reverse-holofoil"), which the line opens on. */
    printing?: string | null;
}) {
    // The printing picked in the switcher, kept with the card it was picked on.
    const [picked, setPicked] = useState<{ tcgId: string; key: string } | null>(null);
    // Kept with the id it was read for, so a sheet reopened on another card never shows this one's line.
    const [loaded, setLoaded] = useState<{ tcgId: string; points: PricePoint[] } | null>(null);
    const [period, setPeriod] = useState<PeriodKey>("6m");
    // What was fetched, or what an earlier open already learned. Derived, so a known line needs
    // no effect and no second render to show.
    const points = loaded?.tcgId === tcgId ? loaded.points : (knownPriceHistory(tcgId) ?? null);

    useEffect(() => {
        if (knownPriceHistory(tcgId)) return;
        let live = true;
        preloadPriceHistory(tcgId).then((p) => {
            if (live) setLoaded({ tcgId, points: p });
        });
        return () => {
            live = false;
        };
    }, [tcgId]);

    // Still on its way: the height the line will take, and nothing said. "No readings" is an
    // answer, and this is not one yet.
    if (points === null) return <div aria-busy="true" style={{ height: CHART_HEIGHT }} />;

    /*
     * One printing's line, never two: the copy's own printing first (the price above the tabs is
     * that printing's), or the one picked in the switcher. A card read as one line of "the price"
     * mixed printings on days one was missing, and a reverse or a 1st Edition copy drew the plain
     * card's line under its own price (pricing audit, 2026-09-14). Without printings in the answer,
     * the plain line, or the foil for a reverse copy.
     */
    const printings = printingsOfLine(points);
    const own = printing && printings.some((p) => p.key === printing) ? printing : null;
    const chosen = picked?.tcgId === tcgId && printings.some((p) => p.key === picked.key) ? picked.key : own;
    const series: ValueSnapshot[] = points
        .map((p) => ({ date: p.date, value: valueOf(p, chosen, holo) }))
        .filter((p): p is { date: string; value: number } => p.value != null)
        .map((p) => ({ ...p, cards: 1, priced: 1, unpriced: 0 }));

    const shown = forChart(series, period);
    const label = printings.find((p) => p.key === chosen)?.label;

    return (
        <ValueChart snapshots={shown} label={`${name ?? "This card"}${label ? ` ${label}` : ""}'s price over time`} countLabel={null}>
            {/* Normal against reverse, 1st Edition against Unlimited and Shadowless: only where the card
                has more than one printing with readings. */}
            {printings.length > 1 ? <ChartPrintings printings={printings} picked={chosen} onPick={(key) => setPicked({ tcgId, key })} /> : null}
            {/* Only where there is more than one period to choose between: a card with a fortnight of
                readings has nothing to say about six months, and five buttons that all draw the same
                line are five ways to learn nothing. */}
            {series.length > 1 ? <ChartPeriods period={period} onPick={setPeriod} /> : null}
        </ValueChart>
    );
}
