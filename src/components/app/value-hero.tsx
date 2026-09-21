"use client";

import { ChartPeriods } from "@/components/app/chart-periods";
import { useHomePeriod } from "@/components/app/home-period";
import { ValueChart } from "@/components/app/value-chart";
import { PERIODS, changeSaid, forChart, isoDaysAgo } from "@/lib/chart-periods";
import { formatValue } from "@/lib/format";
import { splitChange } from "@/lib/value-change";
import type { ValueSnapshot } from "@/lib/value-history";
import { cx } from "@/utils/cx";

// Home's first thing: what the chosen list is worth, big, with how that has moved over a period and
// the line behind it. Which list is the header's choice beside the avatar (home-list-choice.tsx); the
// period buttons under the chart cut the same line, and the change above it is over the period shown.

/** A list Home can be about, as the choice beside the avatar names it. */
export type ValueList = { id: string; name: string };

export function ValueHero({
    name,
    selected,
    value,
    snapshots,
}: {
    /** The chosen list's name, for the chart's label. */
    name: string;
    /** The id of the list shown. */
    selected: string;
    /** What the list is worth now, in euros. */
    value: number;
    /** The list's line, oldest first. */
    snapshots: ValueSnapshot[];
}) {
    // Shared with the movers under the counts (home-period.tsx).
    const { period, setPeriod } = useHomePeriod();
    const chosen = PERIODS.find((p) => p.key === period) ?? PERIODS[1];
    const shown = chosen.days === null ? snapshots : snapshots.filter((s) => s.date >= isoDaysAgo(chosen.days));
    const split = splitChange(shown, value);
    const change = split ? split.change : null;
    /* What the change is over, read off the whole line rather than the period's slice of it: a list
       whose readings do not reach back as far as the button does is measured from its first reading,
       and says that rather than naming a month it has not lived through (Bart, 2026-09-21). */
    const said = changeSaid(period, snapshots);

    return (
        <section aria-labelledby="value-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 id="value-heading" className="text-sm font-semibold text-tertiary">
                    {/* The list by name here too: the choice is across the page, beside the avatar, and a heading
                        is what a screen reader moving from heading to heading hears. */}
                    {selected === "wishlist" ? "Wishlist cost" : selected === "all" ? "Total value" : `${name} value`}
                </h2>
                <p className="text-display-md font-semibold text-primary tabular-nums sm:text-display-lg">{formatValue(value)}</p>
                {/* The sign carries the direction as well as the colour, for a reader who sees neither. */}
                <p
                    className={cx(
                        "text-sm font-medium tabular-nums",
                        change === null || change === 0 ? "text-tertiary" : change > 0 ? "text-success-primary" : "text-error-primary",
                    )}
                    aria-live="polite"
                >
                    {change === null
                        ? "No readings yet for this period."
                        : change === 0
                          ? `Unchanged ${said}`
                          : `${change > 0 ? "+" : "−"}${formatValue(Math.abs(change))} ${said}`}
                </p>
            </div>

            {/* The change above reads every reading; the line draws Max a week a step (forChart). */}
            <ValueChart snapshots={forChart(shown, period)} label={`${name} value over time`} range={false}>
                <ChartPeriods period={period} onPick={setPeriod} />
            </ValueChart>
        </section>
    );
}
