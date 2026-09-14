import type { CSSProperties } from "react";
import { formatCount, formatValue } from "@/lib/format";
import { type SetStats as Stats, secretCount } from "@/lib/set-stats";

/**
 * Ours: the numbers of a set, under its name on its wash.
 *
 * The day it came out as a small line under the title, then two data points on the wash itself, no
 * tile around them: the cards (held out of the set's total, with the secret rares past the printed
 * number) and the value (what the copies held are worth, with what the rest would cost). A label
 * over each number, the way a spec sheet reads. Not a meter: the two counts side by side say the
 * progress. The wishlist is not among them: the set's cards below show which ones are wanted.
 */
export function SetStats({
    stats,
    printedTotal,
    released,
    gallery = null,
}: {
    stats: Stats;
    printedTotal: number | null;
    released: string | null;
    /** The set's gallery, counted in `stats.total` and named apart from the secret rares. */
    gallery?: { name: string; total: number } | null;
}) {
    const secret = secretCount(stats.total, printedTotal, gallery?.total ?? 0);
    const cardsDetail = [secret ? `${formatCount(secret)} secret` : null, gallery ? `${formatCount(gallery.total)} ${gallery.name}` : null]
        .filter(Boolean)
        .join(" · ");
    const complete = stats.owned >= stats.total;
    const valueDetail = complete
        ? "Complete"
        : [`${formatValue(stats.toComplete)} to complete`, stats.unpriced > 0 ? `+ ${formatCount(stats.unpriced)} unpriced` : null].filter(Boolean).join(" ");
    return (
        <>
            {released ? <p className="text-sm text-tertiary">Released {released}</p> : null}
            <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
                <DataPoint label="Cards" value={`${formatCount(stats.owned)} of ${formatCount(stats.total)}`} detail={cardsDetail || undefined} delay={0} />
                <DataPoint label="Value" value={formatValue(stats.value)} detail={valueDetail} delay={40} />
            </dl>
        </>
    );
}

function DataPoint({ label, value, detail, delay }: { label: string; value: string; detail?: string; delay: number }) {
    return (
        <div className="flex arrive flex-col gap-1" style={{ "--arrive-delay": `${delay}ms` } as CSSProperties}>
            <dt className="text-sm font-semibold text-tertiary">{label}</dt>
            <dd className="text-display-xs font-semibold text-primary tabular-nums">
                {value}
                {detail ? <span className="ml-1.5 text-sm font-normal text-tertiary">{detail}</span> : null}
            </dd>
        </div>
    );
}
