"use client";

import { type ReactNode, createContext, useContext, useState } from "react";
import type { PeriodKey } from "@/components/app/chart-periods";

/**
 * Ours: the period Home's value chart shows, shared with the movers under the counts, so picking 7D
 * over the chart moves both. The chart and the movers are not neighbours on the page (the four
 * counts stand between them), so the choice lives above both.
 */
const HomePeriod = createContext<{ period: PeriodKey; setPeriod: (period: PeriodKey) => void } | null>(null);

export function HomePeriodProvider({ children }: { children: ReactNode }) {
    const [period, setPeriod] = useState<PeriodKey>("1m");
    return <HomePeriod.Provider value={{ period, setPeriod }}>{children}</HomePeriod.Provider>;
}

/** The shared period; a month where nothing provides one, as the chart starts. */
export function useHomePeriod(): { period: PeriodKey; setPeriod: (period: PeriodKey) => void } {
    const shared = useContext(HomePeriod);
    return shared ?? { period: "1m", setPeriod: () => {} };
}
