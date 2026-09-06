"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "@untitledui/icons";
import { useRouter } from "next/navigation";
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

const PERIODS = [
    { key: "7d", label: "7D", days: 7, said: "in the last 7 days" },
    { key: "1m", label: "1M", days: 30, said: "in the last 30 days" },
    { key: "3m", label: "3M", days: 91, said: "in the last 3 months" },
    { key: "6m", label: "6M", days: 182, said: "in the last 6 months" },
    { key: "max", label: "Max", days: null, said: "since the first reading" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

const isoDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
};

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
                <div className="flex flex-wrap items-center gap-x-2">
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
                {/* The periods: one pressed, the pill behind it. Tapped often, so the state changes without motion. */}
                <fieldset className="flex justify-center gap-1">
                    <legend className="sr-only">Period</legend>
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            aria-pressed={p.key === period}
                            onClick={() => setPeriod(p.key)}
                            className={cx(
                                "pressable rounded-full px-3 py-1.5 text-sm font-semibold outline-focus-ring transition-colors duration-150 focus-visible:outline-2",
                                p.key === period ? "bg-alpha-black/8 text-primary" : "text-tertiary hover:text-secondary",
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </fieldset>
            </ValueChart>
        </section>
    );
}
