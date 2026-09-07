"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { CardStats } from "@/lib/cards";
import { cx } from "@/utils/cx";

// Stat card after Untitled UI's Metric, without its featured icon: the label and the number say it.
// A link to the list it counts: the tile is the shortest way to All cards, the wishlist, Favorites
// or the Pokédex. `detail` sits on the number's line, small, as "of 1,025" does.
export const StatCard = ({
    label,
    value,
    detail,
    href,
    className,
    delay,
}: {
    label: string;
    value: string;
    /** After the number, on its line, in the small size: what the number is out of. */
    detail?: string;
    /** The list this counts. */
    href?: string;
    className?: string;
    /** Its place in the row: the tiles arrive one after another, 40 ms apart. */
    delay?: number;
}) => {
    const body = (
        <div className="flex flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-5 md:gap-5 md:px-5">
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-tertiary">{label}</h3>
                <p className="text-display-xs font-semibold text-primary tabular-nums sm:text-display-sm">
                    {value}
                    {detail ? <span className="ml-1.5 text-sm font-normal text-tertiary">{detail}</span> : null}
                </p>
            </div>
        </div>
    );
    const surface = cx("block arrive rounded-xl bg-primary shadow-lift-xs ring-1 ring-primary ring-inset", className);
    const style = { "--arrive-delay": `${delay ?? 0}ms` } as React.CSSProperties;
    return href ? (
        <Link href={href} className={cx(surface, "pressable outline-focus-ring hover:bg-primary_hover focus-visible:outline-2")} style={style}>
            {body}
        </Link>
    ) : (
        <div className={surface} style={style}>
            {body}
        </div>
    );
};

const count = (n: number) => n.toLocaleString("en-US");

// Owned, Wishlist, Favorites, and the Pokémon count in the fourth place; the value itself is the
// big number above the chart. The fourth tile arrives as a node so the page can stream it.
export function CardsStats({ stats, fourth }: { stats: CardStats; fourth: ReactNode }) {
    return (
        // Two to a row on a phone, four from xl: a column of four tiles pushed the chart off the first screen.
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            {/* Cards owned, and how many copies that is where it is more: a hundred duplicates are
                a fact about the collection that the card count alone does not say. */}
            <StatCard
                label="Owned"
                value={count(stats.owned)}
                detail={stats.copies > stats.owned ? `${count(stats.copies)} copies` : undefined}
                href="/dashboard/cards"
                delay={0}
            />
            <StatCard label="Wishlist" value={count(stats.wishlist)} href="/dashboard/wishlist" delay={40} />
            <StatCard label="Favorites" value={count(stats.favorites)} href="/dashboard/favorites" delay={80} />
            {fourth}
        </div>
    );
}
