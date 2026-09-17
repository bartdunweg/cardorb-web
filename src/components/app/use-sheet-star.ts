"use client";

import { useRef, useState } from "react";
import { setFavorite } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import type { Card, PublicCard } from "@/lib/cards";
import { forgetMineQuietly } from "@/lib/forget-mine";

type Params = {
    card: Card | PublicCard | null;
    mine: Card | null;
    scheduleRefresh: () => void;
    /**
     * The star as the sheet now shows it, said on the press and again if the save fails and it goes
     * back. A list that stands or falls by the star (Favorites) takes the row off itself here,
     * rather than waiting for the page to be read again.
     */
    onStarChanged?: (cardId: string, starred: boolean) => void;
};

/** The card sheet's star: filled on the press, its saves chained behind it. */
export function useSheetStar({ card, mine, scheduleRefresh, onStarChanged }: Params) {
    /*
     * The star, kept here so a tap answers at once: it fills or empties on the press and the save
     * runs behind it, with no spinner, because a favourite is a mark and not a task to wait for.
     * Bart's call, 2026-09-13. The button stays pressable while a save is out, so the writes go
     * one after the other (a second tap cannot land before the first), and only the last tap's
     * failure puts the star back, to what the store last took: an earlier tap in the run may have
     * failed too, so the tap before is not proof of what was saved.
     */
    // Kept with the row it was pressed on, so a save that fails after the arrows moved on puts
    // back that card's star and not the one now showing.
    const [starred, setStarred] = useState<{ id: string; on: boolean } | null>(null);
    const isStarred = starred && starred.id === mine?.id ? starred.on : (mine?.is_favorite ?? false);
    const starWrites = useRef<Promise<unknown>>(Promise.resolve());
    const starTaps = useRef(0);
    // What the store holds per card while a run of taps is out: taken from the star when a run
    // starts (it shows the store then), moved on by every write that lands, dropped when the run ends.
    const starSaved = useRef(new Map<string, boolean>());
    const toggleStar = () => {
        if (!mine) return;
        const id = mine.id;
        const next = !isStarred;
        const tap = ++starTaps.current;
        if (!starSaved.current.has(id)) starSaved.current.set(id, isStarred);
        setStarred({ id, on: next });
        onStarChanged?.(id, next);
        const putBack = (error?: string) => {
            const saved = starSaved.current.get(id) ?? !next;
            starSaved.current.delete(id);
            setStarred({ id, on: saved });
            onStarChanged?.(id, saved);
            const title = saved ? "That card is still a Favorite" : "That card is not a Favorite";
            if (error === undefined) notify.failed(title);
            else notify.failed(title, { description: error });
        };
        // Written without the re-read (the page drawn inside each answer held the next tap's write
        // in Next's action queue), and the cache dropped once the last tap has landed, either way:
        // the taps before it may have written.
        const write = starWrites.current.then(() => setFavorite(id, next, { reread: false }));
        starWrites.current = write.catch(() => undefined);
        void write.then(
            (res) => {
                if (res.ok) starSaved.current.set(id, next);
                if (tap !== starTaps.current) return;
                const forgotten = forgetMineQuietly("favorite");
                if (res.ok) {
                    starSaved.current.delete(id);
                    void forgotten.then(scheduleRefresh);
                } else putBack(res.error);
            },
            () => {
                if (tap !== starTaps.current) return;
                void forgetMineQuietly("favorite");
                putBack();
            },
        );
    };

    // A different card opens with the store's star, adjusted during render (React's documented
    // pattern for adjusting state on prop change) rather than in an effect.
    const [syncedCardId, setSyncedCardId] = useState(card?.id);
    if (card?.id !== syncedCardId) {
        setSyncedCardId(card?.id);
        setStarred(null);
    }

    return { isStarred, toggleStar };
}
