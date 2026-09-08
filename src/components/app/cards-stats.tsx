import type { ReactNode } from "react";
import Link from "next/link";
import type { CardStats } from "@/lib/cards";
import { cx } from "@/utils/cx";

// No "use client": there is nothing client about these tiles — a link, a class name and two
// strings — and the directive made a hydration root out of markup that never changes. Both
// callers are Server Components, and `fourth` crosses as a rendered node either way.

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
            {/* Every card held, a duplicate counting twice: the number of cards in the boxes, which is
                what "owned" means to the person who owns them. The lists count printings instead — a
                card you hold twice is one row there — so All cards can read one lower. */}
            <StatCard label="Owned" value={count(stats.copies)} href="/dashboard/cards" delay={0} />
            <StatCard label="Wishlist" value={count(stats.wishlist)} href="/dashboard/wishlist" delay={40} />
            <StatCard label="Favorites" value={count(stats.favorites)} href="/dashboard/favorites" delay={80} />
            {fourth}
        </div>
    );
}
