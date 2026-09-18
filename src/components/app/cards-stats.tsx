import type { ReactNode } from "react";
import Link from "next/link";
import type { CardStats } from "@/lib/cards";
import { formatCount } from "@/lib/format";
import { TILE_SURFACE } from "@/lib/tile";
import { cx } from "@/utils/cx";

// No "use client": there is nothing client about these tiles (a link, a class name and two
// strings), and the directive made a hydration root out of markup that never changes. Both
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
        // The full height of the tile, the number at its foot: a label that wraps to two lines ("Pokémon
        // collected" on a 120 px tile) made its tile taller and pushed its number 20 px under the other
        // three, so the row's figures stood on two lines. The row stretches every tile to the tallest, and
        // each number now sits on that tile's floor, level with the rest; the labels start at the top.
        <div className="flex h-full flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-5 md:gap-5 lg:px-5">
            <div className="flex flex-1 flex-col justify-between gap-2">
                <h3 className="text-sm font-semibold text-tertiary">{label}</h3>
                <p className="text-display-xs font-semibold text-primary tabular-nums sm:text-display-sm">
                    {value}
                    {detail ? <span className="ml-1.5 text-sm font-normal text-tertiary">{detail}</span> : null}
                </p>
            </div>
        </div>
    );
    // The page's own ground, not a lighter surface on it: the ring and the lift mark the tile.
    const surface = cx("block arrive", TILE_SURFACE, className);
    const style = { "--arrive-delay": `${delay ?? 0}ms` } as React.CSSProperties;
    return href ? (
        <Link href={href} className={cx(surface, "pressable outline-focus-ring hover:bg-alpha-black/4 focus-visible:outline-2")} style={style}>
            {body}
        </Link>
    ) : (
        <div className={surface} style={style}>
            {body}
        </div>
    );
};

// Collection, Wishlist, Favorites, and the Pokémon count in the fourth place; the value itself is the
// big number above the chart. The fourth tile arrives as a node so the page can stream it.
export function CardsStats({ stats, fourth }: { stats: CardStats; fourth: ReactNode }) {
    return (
        // Two to a row on a phone, four from xl: a column of four tiles pushed the chart off the first screen.
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {/* Every card held, a duplicate counting twice: the number of cards in the boxes, which is
                what "owned" means to the person who owns them. The lists count printings instead (a
                card you hold twice is one row there), so All cards can read one lower. */}
            <StatCard label="Collection" value={formatCount(stats.copies)} href="/dashboard/cards" delay={0} />
            <StatCard label="Wishlist" value={formatCount(stats.wishlist)} href="/dashboard/wishlist" delay={40} />
            <StatCard label="Favorites" value={formatCount(stats.favorites)} href="/dashboard/favorites" delay={80} />
            {fourth}
        </div>
    );
}
