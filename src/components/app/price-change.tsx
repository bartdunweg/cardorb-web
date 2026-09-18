import { formatDate, formatPercent, formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

/**
 * Ours: what one card's price did, under the price: smaller, green up and red down, always with
 * its sign so the colour is never the only thing that says which (Bart's call, 2026-09-18). One
 * look on every tile and row that shows it: a set page's tile, a list's tile and the table.
 *
 * One card's move, not the copies' together: it stands under one card's price. Nothing where
 * there were fewer than two readings or the price did not move, since a line of "€0.00" under
 * half a list says nothing a hundred times. The euros and the percent of the first reading
 * together, "+€0.12 · 5%", as the sheet writes a move (Bart, 2026-09-18). `over` finishes the
 * sentence for a screen reader: "in the last 7 days".
 */
export function PriceMove({ change, over, className }: { change: { was: number; change: number } | null | undefined; over: string; className?: string }) {
    if (!change || change.change === 0) return null;
    const up = change.change > 0;
    const amount = formatPrice(Math.abs(change.change));
    // A first reading of nothing has no percent to give.
    const ratio = change.was > 0 ? Math.abs(change.change) / change.was : null;
    return (
        <span className={cx("text-xs font-medium whitespace-nowrap tabular-nums", up ? "text-success-primary" : "text-error-primary", className)}>
            <span aria-hidden="true">
                {up ? "+" : "−"}
                {amount}
                {/* Under half a percent rounds to "0%", which read as no move beside a move (€3 on a €760 card).
                    Narrow spaces round the dot: the line stands beside a tile's buttons in 78 px, and full
                    ones ran "−€1.30 · 21%" 2 px under them. */}
                {ratio != null ? `\u202F·\u202F${ratio < 0.005 ? "<1%" : formatPercent(ratio)}` : null}
            </span>
            <span className="sr-only">
                {up ? "Up" : "Down"} {amount}
                {ratio != null ? (ratio < 0.005 ? ", under 1 percent," : `, ${Math.round(ratio * 100)} percent,`) : ""} {over}
            </span>
        </span>
    );
}

/** The rest of the sentence for a move read from `from`, the window's first day: "since 11 Sep 2026". */
export const changeSince = (from: string | null | undefined): string => (from ? `since ${formatDate(from)}` : "lately");

/** The move in words, for a control whose own label stands in for its contents: "up €0.12, 5 percent, since …". */
export function priceMoveWords(change: { was: number; change: number; from?: string } | null | undefined): string | null {
    if (!change || change.change === 0) return null;
    const ratio = change.was > 0 ? Math.abs(change.change) / change.was : null;
    const percent = ratio == null ? "" : ratio < 0.005 ? ", under 1 percent" : `, ${Math.round(ratio * 100)} percent`;
    return `${change.change > 0 ? "up" : "down"} ${formatPrice(Math.abs(change.change))}${percent}, ${changeSince(change.from)}`;
}
