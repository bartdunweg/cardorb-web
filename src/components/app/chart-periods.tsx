"use client";

import { Button as AriaButton } from "react-aria-components";
import { cx } from "@/utils/cx";

/**
 * The periods a price line can be read over, and the buttons that pick one.
 *
 * Lifted out of the Home hero when the card sheet's Price tab became the same chart. Two copies
 * of these five buttons would have drifted the first time either was edited, and the whole point
 * of the card's chart is that it is the one people already know from Home.
 */
export const PERIODS = [
    { key: "7d", label: "7D", days: 7, said: "in the last 7 days" },
    { key: "1m", label: "1M", days: 30, said: "in the last 30 days" },
    { key: "3m", label: "3M", days: 91, said: "in the last 3 months" },
    { key: "6m", label: "6M", days: 182, said: "in the last 6 months" },
    { key: "max", label: "Max", days: null, said: "since the first reading" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

/** The ISO date `days` ago, for slicing a series that is already sorted by date. */
export const isoDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
};

/** Everything on or after the period's first day; the whole series for Max. */
export function withinPeriod<T extends { date: string }>(rows: T[], period: PeriodKey): T[] {
    const chosen = PERIODS.find((p) => p.key === period) ?? PERIODS[0];
    if (chosen.days === null) return rows;
    const from = isoDaysAgo(chosen.days);
    return rows.filter((r) => r.date >= from);
}

/**
 * One pressed, the pill behind it. Tapped often, so the state changes without motion.
 *
 * A fieldset with a legend rather than a row of buttons: five controls that set one value are a
 * group, and a screen reader should say so before it reads the first of them.
 */
export function ChartPeriods({ period, onPick, className }: { period: PeriodKey; onPick: (key: PeriodKey) => void; className?: string }) {
    return (
        <fieldset className={cx("flex justify-center gap-1", className)}>
            <legend className="sr-only">Period</legend>
            {PERIODS.map((p) => (
                // The kit's button (react-aria), which answers Enter and Space itself, as the chips do.
                // Not its ButtonGroup: that is a bordered segment, and this is a pill behind a word.
                <AriaButton
                    key={p.key}
                    aria-pressed={p.key === period}
                    onPress={() => onPick(p.key)}
                    className={cx(
                        "pressable rounded-full px-3 py-1.5 text-sm font-semibold outline-focus-ring transition-colors duration-150 focus-visible:outline-2",
                        p.key === period ? "bg-alpha-black/8 text-primary" : "text-tertiary hover:text-secondary",
                    )}
                >
                    {p.label}
                </AriaButton>
            ))}
        </fieldset>
    );
}
