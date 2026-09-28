import type { CSSProperties } from "react";
import { formatCount, formatValue } from "@/lib/format";
import type { SetStats as Stats } from "@/lib/set-stats";
import { cx } from "@/utils/cx";

/**
 * Ours: the numbers of a set, under its name on its wash.
 *
 * The day it came out as a small line under the title, then two data points on the wash itself, no
 * tile around them: Progress (the cards held out of the set's total, with its gallery named where it has one) and Collected value (what the cards held are worth, out of the whole set). A label
 * over each number, the way a spec sheet reads. Not a meter: the two counts side by side say the
 * progress. The wishlist is not among them: the set's cards below show which ones are wanted.
 */
export function SetStats({
    stats,
    released,
    gallery = null,
    compact = false,
}: {
    stats: Stats;
    released: string | null;
    /**
     * From `lg`, at the right end of the name's row, as a collection page's numbers stand beside its
     * name (OpenSea, Binance NFT on Mobbin): no release line (it is under the name there), a smaller
     * figure, the two side by side (Bart, 2026-09-28).
     */
    compact?: boolean;
    /** The set's gallery, counted in `stats.total` and named beside it. */
    gallery?: { name: string; total: number } | null;
}) {
    const cardsDetail = gallery ? `${formatCount(gallery.total)} ${gallery.name}` : undefined;
    // The total is a floor where cards carry no price; the count says by how much it may be short.
    const valueDetail = stats.unpriced > 0 ? `${formatCount(stats.unpriced)} unpriced` : undefined;
    return (
        <>
            {released && !compact ? <p className="text-sm text-tertiary">Released {released}</p> : null}
            <dl className={compact ? "flex gap-x-8 text-right" : "mt-4 flex flex-wrap gap-x-10 gap-y-4"}>
                {/* Progress is yours, so a reader nobody asked gets the set's size instead, under the
                    word for what it counts. "0 of 207" would be a claim about a collection we never read. */}
                {stats.owned === null ? (
                    <DataPoint label="Cards" value={formatCount(stats.total)} detail={cardsDetail} delay={0} compact={compact} />
                ) : (
                    <DataPoint
                        label="Progress"
                        value={`${formatCount(stats.owned)} of ${formatCount(stats.total)}`}
                        detail={cardsDetail}
                        delay={0}
                        compact={compact}
                    />
                )}
                {/* The same rule as the progress beside it: what the cards you hold are worth is
                    yours, so a reader nobody asked reads what the set is worth and nothing about a
                    collection. */}
                {stats.value === null ? (
                    <DataPoint label="Set value" value={formatValue(stats.setValue)} detail={valueDetail} delay={40} compact={compact} />
                ) : (
                    <DataPoint
                        label="Collected value"
                        value={`${formatValue(stats.value)} of ${formatValue(stats.setValue)}`}
                        detail={valueDetail}
                        delay={40}
                        compact={compact}
                    />
                )}
            </dl>
        </>
    );
}

function DataPoint({ label, value, detail, delay, compact }: { label: string; value: string; detail?: string; delay: number; compact: boolean }) {
    return (
        <div className={cx("flex arrive flex-col", compact ? "gap-0.5" : "gap-1")} style={{ "--arrive-delay": `${delay}ms` } as CSSProperties}>
            <dt className={cx("font-semibold text-tertiary", compact ? "text-xs" : "text-sm")}>{label}</dt>
            <dd className={cx("font-semibold text-primary tabular-nums", compact ? "text-lg" : "text-display-xs")}>
                {value}
                {detail ? <span className="ml-1.5 text-sm font-normal text-tertiary">{detail}</span> : null}
            </dd>
        </div>
    );
}
