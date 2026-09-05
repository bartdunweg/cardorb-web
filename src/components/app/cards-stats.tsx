"use client";

import type { CardStats } from "@/lib/cards";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

// Stat card after Untitled UI's Metric, without its featured icon: the label and the number say it, and
// big number. Icons live in this client component so no function crosses the server boundary.
const StatCard = ({
    label,
    value,
    detail,
    className,
    delay,
}: {
    label: string;
    value: string;
    /** A line under the number that qualifies it, like how many copies the value leaves out. */
    detail?: string;
    className?: string;
    /** Its place in the row: the tiles arrive one after another, 40 ms apart. */
    delay?: number;
}) => (
    <div className={cx("arrive rounded-xl bg-primary shadow-border", className)} style={{ "--arrive-delay": `${delay ?? 0}ms` } as React.CSSProperties}>
        <div className="flex flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-5 md:gap-5 md:px-5">
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-tertiary">{label}</h3>
                <p className="text-display-xs font-semibold text-primary tabular-nums sm:text-display-sm">{value}</p>
                {detail ? <p className="text-sm text-tertiary">{detail}</p> : null}
            </div>
        </div>
    </div>
);

const count = (n: number) => n.toLocaleString("en-US");

// What the value leaves out, said once and only when it leaves something out.
const unpricedNote = (unpriced: number) => (unpriced === 0 ? undefined : `${count(unpriced)} ${unpriced === 1 ? "copy" : "copies"} without a price`);

export function CardsStats({ stats }: { stats: CardStats }) {
    return (
        // Two to a row on a phone, four from xl: a column of four tiles pushed the chart off the first screen.
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            <StatCard label="Owned" value={count(stats.owned)} delay={0} />
            <StatCard label="Wishlist" value={count(stats.wishlist)} delay={40} />
            <StatCard label="Favorites" value={count(stats.favorites)} delay={80} />
            <StatCard
                label="Collection value"
                value={formatPrice(stats.value)}
                detail={unpricedNote(stats.unpriced)}

                delay={120}
            />
        </div>
    );
}
