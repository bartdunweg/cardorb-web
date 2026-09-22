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
    /** Raised by a change made outside the tile (the sheet), so the tile starts again from it. */
    outside: number;
};

/**
 * A holding on its own, and an empty one for a card nobody was asked about.
 *
 * A press on such a card is a press by a visitor with no account, which leads to signing in rather
 * than to a write. Nothing is drawn from this: `live()` hands a card whose holding is null straight
 * back, so the empty holding never reaches a tile.
 */
const holdingOf = (h: Holding | null): Holding => (h === null ? { owned: false, quantity: 0, wishlist: false, itemIds: [] } : { ...h });

type Live = {
    /** The card as its tile shows it now. */
    live: (card: SetCard) => SetCard;
    /** `outside`: the change was made in the sheet, not by the tile's own buttons. */
    report: (card: SetCard, patch: Partial<Holding>, outside?: boolean) => void;
    /** How many times the sheet changed this card since the page was drawn, for the tile's stamp. */
    outsideCount: (card: SetCard) => number;
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
        (card: SetCard, patch: Partial<Holding>, outside = false) =>
            setState((s) => {
                const prev = s.changes[card.id];
                const valid = prev && holdingKey(prev.was) === holdingKey(card.holding) ? prev : undefined;
                const count = (valid?.outside ?? 0) + (outside ? 1 : 0);
                return {
                    ...s,
                    changes: {
                        ...s.changes,
                        [card.id]: { ...holdingOf(valid ?? card.holding), ...patch, was: holdingOf(card.holding), price: card.price, outside: count },
                    },
                };
            }),
        [],
    );
    const value = useMemo(() => ({ changes: state.changes, report }), [state.changes, report]);
    return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useSetLive(): Live {
    const { changes, report } = useContext(LiveContext);
    const outsideCount = useCallback(
        (card: SetCard) => {
            const change = changes[card.id];
            return change && holdingKey(change.was) === holdingKey(card.holding) ? change.outside : 0;
        },
        [changes],
    );
    const live = useCallback(
        (card: SetCard) => {
            const change = changes[card.id];
            // A card nobody was asked about has no holding to move, and a press on it never wrote
            // one, so it is drawn exactly as the page read it.
            if (card.holding === null) return card;
            if (!change || holdingKey(change.was) !== holdingKey(card.holding)) return card;
            return { ...card, holding: holdingOf(change) };
        },
        [changes],
    );
    return { live, report, outsideCount };
}

/** The numbers over the set, moved by every press below them. */
export function LiveSetStats(props: { stats: Stats; released: string | null; gallery?: { name: string; total: number } | null }) {
    const { changes } = useContext(LiveContext);
    const stats = useMemo(() => {
        let { owned, value } = props.stats;
        for (const change of Object.values(changes)) {
            const by = Number(change.owned) - Number(change.was.owned);
            // Nobody was asked what is held, so there is no count to move; null stays null rather
            // than becoming a number the moment something is pressed. The value beside it is the
            // same answer, so it stays null too.
            if (owned !== null) owned += by;
            if (value !== null) value += by * (change.price ?? 0);
        }
        return { ...props.stats, owned, value };
    }, [changes, props.stats]);
    return <SetStats {...props} stats={stats} />;
}
