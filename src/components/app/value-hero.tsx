"use client";

import { useTransition } from "react";
import { ChevronDown } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { ChartPeriods } from "@/components/app/chart-periods";
import { useHomePeriod } from "@/components/app/home-period";
import { ValueChart } from "@/components/app/value-chart";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { PERIODS, forChart, isoDaysAgo } from "@/lib/chart-periods";
import { formatValue } from "@/lib/format";
import { splitChange } from "@/lib/value-change";
import type { ValueSnapshot } from "@/lib/value-history";
import { cx } from "@/utils/cx";

// Home's first thing: what the collection is worth, big, with how that has moved over a period
// and the line behind it. The name beside the amount is a menu: All cards, Favorites, or one of the
// binders; a choice goes into the URL (`?value=`) and the page reads that list's line. The period
// buttons under the chart cut the same line; the change above it is over the period shown.

export type ValueList = { id: string; name: string };

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

export function ValueHero({
    lists,
    selected,
    value,
    snapshots,
}: {
    /** All cards first, then Favorites, the binders, and the wishlist last. */
    lists: ValueList[];
    /** The id of the list shown. */
    selected: string;
    /** What the list is worth now, in euros. */
    value: number;
    /** The list's line, oldest first. */
    snapshots: ValueSnapshot[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    // Shared with the movers under the counts (home-period.tsx).
    const { period, setPeriod } = useHomePeriod();
    const chosen = PERIODS.find((p) => p.key === period) ?? PERIODS[1];
    const shown = chosen.days === null ? snapshots : snapshots.filter((s) => s.date >= isoDaysAgo(chosen.days));
    const split = splitChange(shown, value);
    const change = split ? split.change : null;
    const list = lists.find((l) => l.id === selected) ?? lists[0];

    // Dims while the next answer is fetched, after 150 ms, so a quick answer never flickers; it
    // lights up again at once.
    return (
        <section
            aria-labelledby="value-heading"
            className={cx("flex flex-col gap-4 transition-opacity duration-(--duration-fast)", pending && "opacity-60 delay-150")}
        >
            <div className="flex flex-col gap-1">
                <h2 id="value-heading" className="text-sm font-semibold text-tertiary">
                    {selected === "wishlist" ? "Wishlist cost" : "Total value"}
                </h2>
                {/* The list's menu beside the amount it chose, at the row's far end so the menu stays put while the
                    amount changes; a long binder name wraps it under the amount rather than squeezing it. */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-display-md font-semibold text-primary tabular-nums sm:text-display-lg">{formatValue(value)}</p>
                    <Dropdown.Root>
                        <Button color="link-gray" size="sm" iconTrailing={ChevronDown} className="hit-area" aria-label={`Value of ${list.name}; choose a list`}>
                            {list.name}
                        </Button>
                        <Dropdown.Popover placement="bottom start" className="w-56">
                            <Dropdown.Menu
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={new Set([selected])}
                                onSelectionChange={(keys) => {
                                    const key = first(keys);
                                    if (typeof key !== "string" || key === selected) return;
                                    startTransition(() => router.replace(key === "all" ? "/dashboard" : `/dashboard?value=${key}`, { scroll: false }));
                                }}
                            >
                                {lists.map((l) => (
                                    <Dropdown.Item key={l.id} id={l.id}>
                                        {l.name}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
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
                          ? `Unchanged ${chosen.said}`
                          : `${change > 0 ? "+" : "−"}${formatValue(Math.abs(change))} ${chosen.said}`}
                </p>
            </div>

            {/* The change above reads every reading; the line draws Max a week a step (forChart). */}
            <ValueChart snapshots={forChart(shown, period)} label={`${list.name} value over time`}>
                <ChartPeriods period={period} onPick={setPeriod} />
            </ValueChart>
        </section>
    );
}
