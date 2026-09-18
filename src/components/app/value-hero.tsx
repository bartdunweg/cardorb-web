"use client";

import { type FC, createElement, useState, useSyncExternalStore, useTransition } from "react";
import { ChevronDown, Folder, Heart, Rows01, Star01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Header as AriaHeader, Heading as AriaHeading } from "react-aria-components";
import { ChartPeriods } from "@/components/app/chart-periods";
import { FilterChoices } from "@/components/app/filter-chip";
import { useHomePeriod } from "@/components/app/home-period";
import { ValueChart } from "@/components/app/value-chart";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { PERIODS, forChart, isoDaysAgo } from "@/lib/chart-periods";
import { formatValue } from "@/lib/format";
import { splitChange } from "@/lib/value-change";
import type { ValueSnapshot } from "@/lib/value-history";
import { cx } from "@/utils/cx";

// Home's first thing: what the collection is worth, big, with how that has moved over a period
// and the line behind it. The name beside the amount is a menu: All cards, Favorites, or one of the
// binders; a choice goes into the URL (`?value=`) and the page reads that list's line. The menu is
// the filters' own: a menu under the name from sm, a sheet from the bottom on a phone (FilterChip). The period
// buttons under the chart cut the same line; the change above it is over the period shown.

export type ValueList = { id: string; name: string };

const noSubscribe = () => () => {};

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

// Each list wears the sidebar's icon for it: the collection's rows, the star, a binder's folder, the heart.
const iconFor = (id: string): FC<{ className?: string }> => (id === "all" ? Rows01 : id === "favorites" ? Star01 : id === "wishlist" ? Heart : Folder);

// The same mapping drawn as an element, for the chip and the sheet; the menu takes `iconFor` itself.
function ListIcon({ id, className }: { id: string; className: string }) {
    return createElement(iconFor(id), { "aria-hidden": true, className } as { className: string });
}

export function ValueHero({
    lists,
    selected,
    value,
    snapshots,
}: {
    /** The collection and the wishlist, then Favorites and the binders. */
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
    // Two groups, as the sidebar has them: the collection and the wishlist, then the binders under their heading.
    const top = lists.filter((l) => l.id === "all" || l.id === "wishlist");
    const binders = lists.filter((l) => l.id !== "all" && l.id !== "wishlist");
    const asOptions = (group: ValueList[]) =>
        group.map((l) => ({ value: l.id, label: l.name, icon: <ListIcon id={l.id} className="size-5 text-fg-quaternary" /> }));
    const sm = useBreakpoint("sm");
    // One menu trigger at every width, so the server and a phone draw the same button: a trigger on one
    // side of the breakpoint only broke hydration. On a phone its press opens the sheet instead.
    const [menuOpen, setMenuOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    // The breakpoint is `sm` on the server, so the phone's own attributes wait for the browser: before that
    // they would differ from the server's button and break hydration.
    const hydrated = useSyncExternalStore(
        noSubscribe,
        () => true,
        () => false,
    );
    const phone = hydrated && !sm;
    const choose = (key: string) => {
        if (key === selected) return;
        startTransition(() => router.replace(key === "all" ? "/dashboard" : `/dashboard?value=${key}`, { scroll: false }));
    };
    // Browse's filter menus' own button (filters-sheet.tsx, FilterMenu): the list's icon, its name, the chevron.
    const trigger = (
        <Button
            color="secondary"
            size="sm"
            iconTrailing={ChevronDown}
            aria-label={`Value of ${list.name}; choose a list`}
            // On a phone the press opens a sheet, a dialog, not the menu the trigger announces.
            aria-haspopup={phone ? "dialog" : undefined}
            aria-expanded={phone ? sheetOpen : undefined}
        >
            {/* One box: the kit wraps the children in an inline span, where an icon and a word break onto two lines. */}
            <span className="inline-flex items-center gap-1.5">
                <ListIcon id={list.id} className="size-4 shrink-0 text-fg-quaternary" />
                <span className="max-w-40 truncate">{list.name}</span>
            </span>
        </Button>
    );

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
                    <Dropdown.Root
                        isOpen={menuOpen}
                        onOpenChange={(next) => {
                            // Closing always closes: a menu opened wide and then narrowed past sm must still shut.
                            if (!next) setMenuOpen(false);
                            else if (sm) setMenuOpen(true);
                            else setSheetOpen(true);
                        }}
                    >
                        {trigger}
                        <Dropdown.Popover placement="bottom end" className="w-56">
                            <Dropdown.Menu
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={new Set([selected])}
                                onSelectionChange={(keys) => {
                                    const key = first(keys);
                                    if (typeof key === "string") choose(key);
                                }}
                            >
                                <Dropdown.Section>
                                    {top.map((l) => (
                                        <Dropdown.Item key={l.id} id={l.id} icon={iconFor(l.id)}>
                                            {l.name}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Section>
                                <Dropdown.Separator />
                                <Dropdown.Section>
                                    <AriaHeader className="px-3 pt-2 pb-1 text-xs font-semibold text-quaternary">Binders</AriaHeader>
                                    {binders.map((l) => (
                                        <Dropdown.Item key={l.id} id={l.id} icon={iconFor(l.id)}>
                                            {l.name}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Section>
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                    <SlideoutMenu isDismissable isOpen={sheetOpen} onOpenChange={setSheetOpen} dialogClassName="max-h-[70dvh]">
                        {({ close }) => (
                            <>
                                <SlideoutMenu.Header onClose={close}>
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        Choose a list
                                    </AriaHeading>
                                </SlideoutMenu.Header>
                                {/* role="presentation", not the kit's default "main": the page already has a <main>. */}
                                {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                                <SlideoutMenu.Content role="presentation" className="gap-0 pb-4">
                                    <FilterChoices
                                        label="Collection and wishlist"
                                        focusField={false}
                                        value={[selected]}
                                        options={asOptions(top)}
                                        onChange={(next) => {
                                            if (next[0]) choose(next[0]);
                                            close();
                                        }}
                                    />
                                    {/* Seen only: the choices' own legend says "Binders" to a screen reader. */}
                                    <p aria-hidden="true" className="px-2 pt-3 pb-1 text-xs font-semibold text-quaternary">
                                        Binders
                                    </p>
                                    <FilterChoices
                                        label="Binders"
                                        focusField={false}
                                        value={[selected]}
                                        options={asOptions(binders)}
                                        onChange={(next) => {
                                            if (next[0]) choose(next[0]);
                                            close();
                                        }}
                                    />
                                </SlideoutMenu.Content>
                            </>
                        )}
                    </SlideoutMenu>
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
            <ValueChart snapshots={forChart(shown, period)} label={`${list.name} value over time`} range={false}>
                <ChartPeriods period={period} onPick={setPeriod} />
            </ValueChart>
        </section>
    );
}
