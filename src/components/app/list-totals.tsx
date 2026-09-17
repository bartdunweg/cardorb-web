"use client";

import { type ReactNode, createContext, use, useCallback, useState } from "react";
import { type Datapoints, datapointsLines } from "@/lib/folder-datapoints";

/**
 * What the presses on a list's tiles have changed since the page drew its count and value.
 *
 * A tile's minus and plus write without drawing the list again (a redrawn list starts over from
 * its first batch), so the line under the title, "1,928 cards · €40,189", stood still while the
 * counts under it moved. Each press adds what it changed to a running tally here: copies, euros
 * where the card has a price, and a row when a tile leaves the list. A failed write takes its part
 * back the same way. The line shows the page's numbers plus the tally since those numbers arrived:
 * a page that draws new ones (you came back, or a sheet redrew it) already counts every press
 * before it.
 */
export type TotalsChange = { copies: number; value: number; rows: number };
type Change = (by: Partial<TotalsChange>) => void;

const NONE: TotalsChange = { copies: 0, value: 0, rows: 0 };
/* Two contexts, not one `{ by, change }`: that object was new on every press, so every tile on the
   list (each reads `change`) was drawn again for a press on one of them. `change` keeps its identity
   for the provider's life; only the line under the title reads `by`. */
const ChangeContext = createContext<Change | null>(null);
const ByContext = createContext<TotalsChange | null>(null);

export function ListTotalsProvider({ children }: { children: ReactNode }) {
    const [by, setBy] = useState<TotalsChange>(NONE);
    const change = useCallback<Change>(
        (d) => setBy((s) => ({ copies: s.copies + (d.copies ?? 0), value: s.value + (d.value ?? 0), rows: s.rows + (d.rows ?? 0) })),
        [],
    );
    return (
        <ChangeContext value={change}>
            <ByContext value={by}>{children}</ByContext>
        </ChangeContext>
    );
}

/** For a tile: where its presses are counted. Null outside a list page, where there is no line to move. */
export function useListTotals(): Change | null {
    return use(ChangeContext);
}

/** The line under a list's title: the page's numbers, with what the presses since have changed. */
export function LiveDatapoints({ datapoints }: { datapoints: Datapoints }) {
    const by = use(ByContext) ?? NONE;
    // The tally as it stood when these numbers arrived. Reset during render, the shape React asks for.
    const [from, setFrom] = useState({ datapoints, by });
    if (from.datapoints !== datapoints) setFrom({ datapoints, by });
    const since = from.datapoints === datapoints ? from.by : by;
    const shown: Datapoints = {
        ...datapoints,
        total: Math.max(0, datapoints.total + by.rows - since.rows),
        copies: datapoints.copies == null ? undefined : Math.max(0, datapoints.copies + by.copies - since.copies),
        value: datapoints.value == null ? datapoints.value : Math.max(0, datapoints.value + by.value - since.value),
    };
    return (
        <>
            {datapointsLines(shown).map((line, i) => (
                <span key={i} className="block arrive">
                    {line}
                </span>
            ))}
        </>
    );
}
