import { StatCard } from "@/components/app/cards-stats";
import { Badge } from "@/components/base/badges/badges";
import { formatCount, formatValue } from "@/lib/format";
import { type SetStats as Stats, secretLabel } from "@/lib/set-stats";

/**
 * Ours: what a set is and where the owner stands in it, under the set's name on its wash.
 *
 * The facts about the set are badges (its era, the day it came out, the secret rares
 * past the printed number) and the owner's own numbers are four tiles. The tiles are the
 * dashboard's StatCard on a see-through ground, so the logo's colours still reach them: they belong
 * to the band at the top of the page, not to the grid of cards under it. Not a meter: "48 of 207"
 * says the progress in the words the header always used.
 */
export function SetFacts({
    name,
    series,
    localName,
    released,
    total,
    printedTotal,
}: {
    name: string;
    series: string;
    localName: string | null;
    released: string | null;
    total: number;
    printedTotal: number | null;
}) {
    const secret = secretLabel(total, printedTotal);
    return (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="About this set">
            {localName ? (
                <li>
                    <Badge type="modern" size="md">
                        {localName}
                    </Badge>
                </li>
            ) : null}
            {/* Scarlet & Violet is a set of its own and the era it opened: its name once is enough. */}
            {series !== name ? (
                <li>
                    <Badge type="modern" size="md">
                        {series}
                    </Badge>
                </li>
            ) : null}
            {released ? (
                <li>
                    <Badge type="modern" size="md">
                        Released {released}
                    </Badge>
                </li>
            ) : null}
            {secret ? (
                <li>
                    <Badge type="modern" size="md">
                        {secret}
                    </Badge>
                </li>
            ) : null}
        </ul>
    );
}

// See-through, so the wash shows through the tiles the way it shows through the page behind them.
const onWash = "bg-primary/70 backdrop-blur-md";

export function SetStatTiles({ stats }: { stats: Stats }) {
    return (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Your cards" value={formatCount(stats.owned)} detail={`of ${formatCount(stats.total)}`} className={onWash} delay={0} />
            <StatCard label="Value" value={formatValue(stats.value)} className={onWash} delay={40} />
            <StatCard
                label="To complete"
                value={stats.owned >= stats.total ? "Done" : formatValue(stats.toComplete)}
                detail={stats.unpriced > 0 && stats.owned < stats.total ? `+ ${formatCount(stats.unpriced)} unpriced` : undefined}
                className={onWash}
                delay={80}
            />
            <StatCard label="Wishlist" value={formatCount(stats.wishlist)} className={onWash} delay={120} />
        </div>
    );
}
