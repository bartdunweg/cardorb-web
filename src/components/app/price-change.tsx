import type { PriceChange as Change } from "@/lib/api-shapes";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

/**
 * Ours: what a card's price did over a list's period, on a list sorted by price change: the move
 * over the copies held, with its sign and in the colour of its direction, and for a screen reader
 * the words. Nothing where the list is not sorted that way; "No readings" where it is and the card
 * has fewer than two in the period, so a card at the bottom of the list says why it is there.
 */
export function PriceChangeLine({ change, className }: { change: Change | null | undefined; className?: string }) {
    if (change === undefined) return null;
    if (change === null) return <span className={cx("text-xs text-tertiary", className)}>No readings</span>;
    const up = change.total > 0;
    const flat = change.total === 0;
    return (
        <span className={cx("text-xs font-medium tabular-nums", flat ? "text-tertiary" : up ? "text-success-primary" : "text-error-primary", className)}>
            <span className="sr-only">{flat ? "Unchanged " : up ? "Up " : "Down "}</span>
            {flat ? "" : up ? "+" : "−"}
            {formatPrice(Math.abs(change.total))}
        </span>
    );
}
