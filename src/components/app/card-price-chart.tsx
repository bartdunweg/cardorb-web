"use client";

import { useEffect, useState } from "react";
import { type PricePoint, cardPriceHistory } from "@/app/(app)/dashboard/cards/actions";
import { ChartPeriods, type PeriodKey, withinPeriod } from "@/components/app/chart-periods";
import { ValueChart } from "@/components/app/value-chart";
import type { ValueSnapshot } from "@/lib/value-history";

/**
 * One card's price over time — the same chart Home draws for the whole collection.
 *
 * It was a 320×56 sparkline with no axis, no scrubbing and no periods: a shape, not a reading.
 * The collection's chart already had all three, so the card gets that one rather than a second
 * one grown to look like it. `ValueChart` takes `ValueSnapshot`, whose `cards` counts copies, so
 * the tooltip's count line is turned off here — one card's price is a price, not a sum.
 *
 * The API answers with every reading it has, so the periods are a filter over what is already in
 * hand rather than a new request each time.
 */
export function CardPriceChart({ tcgId, holo = false, name }: { tcgId: string; holo?: boolean; name?: string | null }) {
    // Kept with the id it was read for, so a sheet reopened on another card never shows this one's line.
    const [loaded, setLoaded] = useState<{ tcgId: string; points: PricePoint[] } | null>(null);
    const [period, setPeriod] = useState<PeriodKey>("6m");
    const points = loaded?.tcgId === tcgId ? loaded.points : null;

    useEffect(() => {
        let live = true;
        cardPriceHistory(tcgId).then((p) => {
            if (live) setLoaded({ tcgId, points: p });
        });
        return () => {
            live = false;
        };
    }, [tcgId]);

    // A reverse holo reads the foil's price, the same rule the price above the tabs follows.
    const series: ValueSnapshot[] = (points ?? [])
        .map((p) => ({ date: p.date, value: (holo ? p.holo : null) ?? p.market }))
        .filter((p): p is { date: string; value: number } => p.value != null)
        .map((p) => ({ ...p, cards: 1, priced: 1, unpriced: 0 }));

    const shown = withinPeriod(series, period);

    return (
        <ValueChart snapshots={shown} label={`${name ?? "This card"}'s price over time`} countLabel={null}>
            {/* Only where there is more than one period to choose between: a card with a fortnight of
                readings has nothing to say about six months, and five buttons that all draw the same
                line are five ways to learn nothing. */}
            {series.length > 1 ? <ChartPeriods period={period} onPick={setPeriod} /> : null}
        </ValueChart>
    );
}
