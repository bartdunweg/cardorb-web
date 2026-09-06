"use client";

import type { ReactNode } from "react";
import type { CardStats } from "@/lib/cards";
import { cx } from "@/utils/cx";

// Stat card after Untitled UI's Metric, without its featured icon: the label and the number say it.
export const StatCard = ({
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
    <div
        className={cx("arrive rounded-xl bg-primary shadow-lift-xs ring-1 ring-primary ring-inset", className)}
        style={{ "--arrive-delay": `${delay ?? 0}ms` } as React.CSSProperties}
    >
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

// Owned, Wishlist, Favorites, and the Pokémon count in the fourth place; the value itself is the
// big number above the chart. The fourth tile arrives as a node so the page can stream it.
export function CardsStats({ stats, fourth }: { stats: CardStats; fourth: ReactNode }) {
    return (
        // Two to a row on a phone, four from xl: a column of four tiles pushed the chart off the first screen.
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            <StatCard label="Owned" value={count(stats.owned)} delay={0} />
            <StatCard label="Wishlist" value={count(stats.wishlist)} delay={40} />
            <StatCard label="Favorites" value={count(stats.favorites)} delay={80} />
            {fourth}
        </div>
    );
}
