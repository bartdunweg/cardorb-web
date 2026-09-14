"use server";

import type { PeriodKey } from "@/components/app/chart-periods";
import { type Mover, type MoversPeriod, getMovers } from "@/lib/movers";

const DAYS: Record<PeriodKey, MoversPeriod> = { "7d": "7", "1m": "30", "3m": "90", "6m": "180", max: "all" };

/**
 * Home's movers for the period the chart shows. Null when the API cannot answer: the block says it
 * could not read them rather than drawing an empty list, which would say nothing moved.
 */
export async function moversFor(period: PeriodKey): Promise<{ up: Mover[]; down: Mover[] } | null> {
    const days = DAYS[period];
    if (!days) return null;
    try {
        return await getMovers(days);
    } catch (err) {
        console.error("Movers unavailable:", err instanceof Error ? err.message : err);
        return null;
    }
}
