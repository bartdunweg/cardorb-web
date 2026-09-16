/**
 * The periods a price line can be read over, and how a period is cut out of a line: what the
 * chart draws and what the figure beside a price reads, in one place so the two never apply the
 * rules apart (the Max figure read the daily line while the chart drew the weekly one, 2026-09-16).
 * The buttons that pick a period live beside them in `components/app/chart-periods.tsx`.
 */

/** The ISO date `days` ago, for slicing a series that is already sorted by date. */
export const isoDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    // The local calendar day, as `today()` writes it: toISOString is UTC, a day early after midnight in Amsterdam.
    return d.toLocaleDateString("en-CA");
};

export const PERIODS = [
    { key: "7d", label: "7D", days: 7, said: "in the last 7 days" },
    { key: "1m", label: "1M", days: 30, said: "in the last 30 days" },
    { key: "3m", label: "3M", days: 91, said: "in the last 3 months" },
    { key: "6m", label: "6M", days: 182, said: "in the last 6 months" },
    { key: "max", label: "Max", days: null, said: "since the first reading" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

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
