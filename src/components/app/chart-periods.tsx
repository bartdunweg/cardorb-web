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

const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * One reading a week, the week's Saturday its date: what Max draws.
 *
 * The chart spaces readings evenly, one step each, so a line of nightly readings for six months and
 * weekly ones before drew the last six months wider than the two years before them (the archive
 * keeps days for six months, a week each before that: Bart, 2026-09-14). Grouped by Sunday to
 * Saturday week, every step is a week, and a point sits on its Saturday whatever day the reading
 * was, which the tooltip makes honest by naming the week ("Jun 7 - 13, 2025"). The week still
 * running ends on its last reading, never on a Saturday still to come.
 *
 * A week's value is the average of its readings, and cards added during the week are summed onto
 * it, so a ring still says what joined. It was the week's last reading until 2026-09-14, and a card
 * in its first week read as its cheapest day: Pitch Black Grubbin sold at €0.43 to €0.26 in presale
 * and €0.03 by the Saturday, so Max began at €0.03 while 6M began at €0.43 (Bart: the two have to
 * feel the same). A week older than six months holds one reading, whose average is itself.
 */
export function byWeek<T extends { date: string; value?: number; added?: number; addedValue?: number }>(rows: T[]): (T & { weekFrom: string })[] {
    const weeks = new Map<string, T & { weekFrom: string }>();
    const sums = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
        const day = utc(row.date);
        const sunday = new Date(day);
        sunday.setUTCDate(day.getUTCDate() - day.getUTCDay());
        const saturday = new Date(sunday);
        saturday.setUTCDate(sunday.getUTCDate() + 6);
        const weekFrom = isoOf(sunday);
        const kept = weeks.get(weekFrom);
        const added = (kept?.added ?? 0) + (row.added ?? 0);
        const addedValue = (kept?.addedValue ?? 0) + (row.addedValue ?? 0);
        const sum = sums.get(weekFrom) ?? { total: 0, count: 0 };
        if (typeof row.value === "number") sums.set(weekFrom, { total: sum.total + row.value, count: sum.count + 1 });
        const averaged = sums.get(weekFrom);
        weeks.set(weekFrom, {
            ...row,
            ...(typeof row.value === "number" && averaged ? { value: Math.round((averaged.total / averaged.count) * 100) / 100 } : {}),
            ...(row.added !== undefined || kept?.added !== undefined ? { added } : {}),
            ...(row.addedValue !== undefined || kept?.addedValue !== undefined ? { addedValue } : {}),
            date: isoOf(saturday),
            weekFrom,
        });
    }
    const today = isoOf(new Date());
    const out = [...weeks.values()].sort((a, b) => a.date.localeCompare(b.date));
    const last = out[out.length - 1];
    if (last && last.date > today) {
        const latest = rows.reduce((max, r) => (r.date > max ? r.date : max), last.weekFrom);
        out[out.length - 1] = { ...last, date: latest };
    }
    return out;
}

/** The period's readings as the chart draws them: every day up to 6M, one a week for Max. */
export function forChart<T extends { date: string; added?: number; addedValue?: number }>(rows: T[], period: PeriodKey): T[] {
    const within = withinPeriod(rows, period);
    return period === "max" ? byWeek(within) : within;
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
