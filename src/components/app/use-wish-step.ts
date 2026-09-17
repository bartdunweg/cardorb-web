"use client";

import { useEffect, useRef } from "react";
import { removeCard } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import { useLatestPress } from "@/components/app/use-latest-press";
import { forgetMineQuietly } from "@/lib/forget-mine";

type Added = { ok: true; id?: string } | { ok: false; error: string };

/**
 * The heart under a set tile: on the wishlist or off it, at once.
 *
 * The heart waited for the write and then for the whole set page to be drawn again: 6.2 s for one
 * press, measured 2026-09-16, of which the write was 0.8 s. Now the heart fills under the finger and
 * the store follows, the way the plus does (`useLatestPress`): one write in the air at a time, always
 * for the last state pressed, and the cache forgotten once without drawing the page again.
 *
 * `id` is the wish's row once the store has one: the plus beside the heart opens the form that moves
 * that row into the collection, so it waits for it.
 */
export function useWishStep({
    name,
    wished: wishedOnPage,
    rowId,
    add,
    onShown,
    onStored,
}: {
    /** The card's name, for the toasts. */
    name: string;
    /** Whether the page says the card is wished for. */
    wished: boolean;
    /** The wish's row, where there is one. */
    rowId: string | undefined;
    add: () => Promise<Added>;
    /** Every change the heart shows, so the page's counts follow it. */
    onShown?: (wished: boolean) => void;
    /** The row the store holds after a write: an id, or none. */
    onStored?: (id: string | undefined) => void;
}) {
    // The toast's way back presses the heart as it is now, not as it was when the toast went up.
    const latest = useRef<(wished: boolean) => void>(() => undefined);
    const steps = useLatestPress<boolean>({
        value: wishedOnPage,
        id: rowId,
        write: async ({ id }, wished) => {
            if (wished) {
                const res = await add();
                if (!res.ok || !res.id) return { failure: res.ok ? "The card was added, but this page could not follow. Reload to see it." : res.error };
                notify.done(`${name} is on your wishlist now`, { undo: { onUndo: () => latest.current(false) } });
                return { value: true, id: res.id };
            }
            if (!id) return { failure: "This wish cannot be changed from here." };
            const res = await removeCard(id, { reread: false });
            if (!res.ok) return { failure: res.error };
            notify.removed(`${name} is off your wishlist`, { undo: { label: "Put back", onUndo: () => latest.current(true) } });
            return { value: false, id: undefined };
        },
        settle: () => forgetMineQuietly("cards"),
        onStored: onStored && (({ id }) => onStored(id)),
        onFailed: ({ error, threw, stored }) => {
            onShown?.(stored.value);
            onStored?.(stored.id);
            /* A write that threw (no signal, a deploy in between) is said in a toast. Without a catch
               the heart once stayed "in the air" for good and did nothing until a reload. */
            if (!threw) return error;
            notify.failed(stored.value ? `${name} is still on your wishlist` : `${name} was not added to your wishlist`);
            return null;
        },
    });

    const press = (next: boolean) => {
        onShown?.(next);
        steps.press(next);
    };

    useEffect(() => {
        latest.current = press;
    });

    return { wished: steps.value, id: steps.id, press, error: steps.error };
}
