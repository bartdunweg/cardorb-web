"use client";

import { Button as AriaButton } from "react-aria-components";
import { PERIODS, type PeriodKey } from "@/lib/chart-periods";
import { cx } from "@/utils/cx";

/**
 * The periods a price line can be read over, and the buttons that pick one.
 *
 * Lifted out of the Home hero when the card sheet's Price tab became the same chart. Two copies
 * of these five buttons would have drifted the first time either was edited, and the whole point
 * of the card's chart is that it is the one people already know from Home.
 */
export { PERIODS, byWeek, forChart, withinPeriod, type PeriodKey } from "@/lib/chart-periods";

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
