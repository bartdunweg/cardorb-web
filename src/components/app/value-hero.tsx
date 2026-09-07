"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { ChartPeriods, PERIODS, type PeriodKey, isoDaysAgo } from "@/components/app/chart-periods";
import { ValueChart } from "@/components/app/value-chart";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { formatValue } from "@/lib/format";
import type { ValueSnapshot } from "@/lib/value-history";
import { cx } from "@/utils/cx";

// Home's first thing: what the collection is worth, big, with how that has moved over a period
// and the line behind it. The name beside the label is a menu: All cards, Favorites, or one of the
// folders; a choice goes into the URL (`?value=`) and the page reads that list's line. The period
// buttons under the chart cut the same line; the change above it is over the period shown.

export type ValueList = { id: string; name: string };

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

export function ValueHero({
    lists,
    selected,
    value,
    snapshots,
}: {
    /** All cards first, then Favorites, the folders, and the wishlist last. */
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
    const [period, setPeriod] = useState<PeriodKey>("1m");
    const chosen = PERIODS.find((p) => p.key === period) ?? PERIODS[1];
    const shown = chosen.days === null ? snapshots : snapshots.filter((s) => s.date >= isoDaysAgo(chosen.days));
    const from = shown[0];
    const change = from ? Math.round(value) - from.value : null;
    const list = lists.find((l) => l.id === selected) ?? lists[0];

    return (
        <section aria-labelledby="value-heading" className={cx("flex flex-col gap-4 transition-opacity duration-150", pending && "opacity-60")}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-x-2">
                    <h2 id="value-heading" className="text-sm font-semibold text-tertiary">
                        {selected === "wishlist" ? "Wishlist cost" : "Collection value"}
                    </h2>
                    <Dropdown.Root>
                        <Button color="link-gray" size="sm" iconTrailing={ChevronDown} aria-label={`Value of ${list.name}; choose a list`}>
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
                          ? `Unchanged ${chosen.said}`
                          : `${change > 0 ? "+" : "−"}${formatValue(Math.abs(change))} ${chosen.said}`}
                </p>
            </div>

            <ValueChart snapshots={shown} label={`${list.name} value over time`}>
                <ChartPeriods period={period} onPick={setPeriod} />
            </ValueChart>
        </section>
    );
}
