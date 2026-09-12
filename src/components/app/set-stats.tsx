import { StatCard } from "@/components/app/cards-stats";
import { formatCount, formatValue } from "@/lib/format";
import { type SetStats as Stats, secretCount } from "@/lib/set-stats";

/**
 * Ours: the numbers of a set, under its name on its wash.
 *
 * Six tiles, two rows of three from `sm`: first the set's own (the day it came out, how many cards
 * it has with the secret rares past the printed number), then the owner's. They are the
 * dashboard's StatCard on a see-through ground, so the logo's colours still reach them: they belong
 * to the band at the top of the page, not to the grid of cards under it. Not a meter: two numbers
 * side by side say the progress.
 */
// See-through, so the wash shows through the tiles the way it shows through the page behind them.
const onWash = "bg-primary/70 backdrop-blur-md";

export function SetStatTiles({ stats, printedTotal, released }: { stats: Stats; printedTotal: number | null; released: string | null }) {
    const secret = secretCount(stats.total, printedTotal);
    return (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard label="Released" value={released ?? "Unknown"} className={onWash} delay={0} />
            <StatCard
                label="Cards in set"
                value={formatCount(stats.total)}
                detail={secret ? `${formatCount(secret)} secret` : undefined}
                className={onWash}
                delay={40}
            />
            <StatCard label="Your cards" value={formatCount(stats.owned)} className={onWash} delay={80} />
            <StatCard label="Value" value={formatValue(stats.value)} className={onWash} delay={120} />
            <StatCard
                label="To complete"
                value={stats.owned >= stats.total ? "Done" : formatValue(stats.toComplete)}
                detail={stats.unpriced > 0 && stats.owned < stats.total ? `+ ${formatCount(stats.unpriced)} unpriced` : undefined}
                className={onWash}
                delay={160}
            />
            <StatCard label="Wishlist" value={formatCount(stats.wishlist)} className={onWash} delay={200} />
        </div>
    );
}
