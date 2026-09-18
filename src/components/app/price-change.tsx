import { formatDate, formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

/**
 * Ours: what one card's price did, under the price on a tile: smaller, green up and red down,
 * always with its sign so the colour is never the only thing that says which (Bart's call,
 * 2026-09-18). One look on every tile and row that shows it: a set page's tile, a list's tile,
 * Home's most valuable cards and the table. The euros alone: the percent is the card sheet's,
 * where there is room to read it (Bart, the same day).
 *
 * One card's move, not the copies' together: it stands under one card's price. Nothing where
 * there were fewer than two readings or the price did not move, since a line of "€0.00" under
 * half a list says nothing a hundred times. `over` finishes the sentence for a screen reader:
 * "in the last 7 days".
 */
export function PriceMove({ change, over, className }: { change: { change: number } | null | undefined; over: string; className?: string }) {
    if (!change || change.change === 0) return null;
    const up = change.change > 0;
    const amount = formatPrice(Math.abs(change.change));
    return (
        <span className={cx("text-xs font-medium whitespace-nowrap tabular-nums", up ? "text-success-primary" : "text-error-primary", className)}>
            <span aria-hidden="true">
                {up ? "+" : "−"}
                {amount}
            </span>
            <span className="sr-only">
                {up ? "Up" : "Down"} {amount} {over}
            </span>
        </span>
    );
}

/** The rest of the sentence for a move read from `from`, the window's first day: "since Sep 11, 2026". */
export const changeSince = (from: string | null | undefined): string => (from ? `since ${formatDate(from)}` : "lately");

/** The move in words, for a control whose own label stands in for its contents: "up €0.12 since …". */
export function priceMoveWords(change: { change: number; from?: string } | null | undefined): string | null {
    if (!change || change.change === 0) return null;
    return `${change.change > 0 ? "up" : "down"} ${formatPrice(Math.abs(change.change))} ${changeSince(change.from)}`;
}
