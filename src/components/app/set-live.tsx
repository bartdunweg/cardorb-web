"use client";

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { SetStats } from "@/components/app/set-stats";
import type { SetCard } from "@/lib/api-shapes";
import { type Holding, holdingKey } from "@/lib/set-holding";
import type { SetStats as Stats } from "@/lib/set-stats";

type Change = Holding & {
    /** The card as the page drew it when the change was made: a page drawn since is the truth again. */
    was: Holding;
    price: number | null;
};

const holdingOf = ({ owned, quantity, wishlist, itemIds }: Holding): Holding => ({ owned, quantity, wishlist, itemIds });

type Live = {
    /** The card as its tile shows it now. */
    live: (card: SetCard) => SetCard;
    report: (card: SetCard, patch: Partial<Holding>) => void;
};

const LiveContext = createContext<{ changes: Record<string, Change> } & Pick<Live, "report">>({ changes: {}, report: () => undefined });

/**
 * Ours: what the buttons under a set's cards changed, held on the page rather than read back.
 *
 * A press used to be written and then the whole page drawn again, set, header and sidebar, before
 * anything on it moved: 3 to 6 s a press (2026-09-16). The tiles now show a press at once and write
 * without drawing the page (`useCopySteps`, `useWishStep`); this is where they say what they changed,
 * so the counts over the set, the tabs and the sheet agree with the tiles.
 *
 * `stamp` is the page's own reading of what you hold: a page drawn again (a form that files a copy
 * does that) has the writes in it, so the changes held here are dropped.
 */
export function SetLive({ stamp, children }: { stamp: string; children: ReactNode }) {
    const [state, setState] = useState<{ stamp: string; changes: Record<string, Change> }>({ stamp, changes: {} });
    if (state.stamp !== stamp) setState({ stamp, changes: {} });
    const report = useCallback(
        (card: SetCard, patch: Partial<Holding>) =>
            setState((s) => {
                const prev = s.changes[card.id];
                const base = prev && holdingKey(prev.was) === holdingKey(card) ? prev : card;
                return {
                    ...s,
                    changes: { ...s.changes, [card.id]: { ...holdingOf(base), ...patch, was: holdingOf(card), price: card.price } },
                };
            }),
        [],
    );
    const value = useMemo(() => ({ changes: state.changes, report }), [state.changes, report]);
    return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useSetLive(): Live {
    const { changes, report } = useContext(LiveContext);
    const live = useCallback(
        (card: SetCard) => {
            const change = changes[card.id];
            if (!change || holdingKey(change.was) !== holdingKey(card)) return card;
            return { ...card, ...holdingOf(change) };
        },
        [changes],
    );
    return { live, report };
}

/** The numbers over the set, moved by every press below them. */
export function LiveSetStats(props: { stats: Stats; released: string | null; gallery?: { name: string; total: number } | null }) {
    const { changes } = useContext(LiveContext);
    const stats = useMemo(() => {
        let { owned, value } = props.stats;
        for (const change of Object.values(changes)) {
            const by = Number(change.owned) - Number(change.was.owned);
            owned += by;
            value += by * (change.price ?? 0);
        }
        return { ...props.stats, owned, value };
    }, [changes, props.stats]);
    return <SetStats {...props} stats={stats} />;
}
