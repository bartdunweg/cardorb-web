"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { removeCard } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import { forgetMineQuietly } from "@/components/app/use-copy-steps";

type Added = { ok: true; id?: string } | { ok: false; error: string };

/**
 * The heart under a set tile: on the wishlist or off it, at once.
 *
 * The heart waited for the write and then for the whole set page to be drawn again: 6.2 s for one
 * press, measured 2026-09-16, of which the write was 0.8 s. Now the heart fills under the finger and
 * the store follows, the way the plus does (`useCopySteps`): one write in the air at a time, always
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
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const page = `${wishedOnPage}:${rowId ?? ""}`;
    // The last state pressed, the row it has so far, and the page it was pressed on.
    const [pressed, setPressed] = useState<{ wished: boolean; id: string | undefined; on: string } | null>(null);
    const shown = pressed && (pending || pressed.on === page) ? pressed : { wished: wishedOnPage, id: rowId };
    const want = useRef(wishedOnPage);
    const flying = useRef(false);
    const stored = useRef<{ wished: boolean; id: string | undefined }>({ wished: wishedOnPage, id: rowId });
    const seen = useRef(page);
    // The toast's way back presses the heart as it is now, not as it was when the toast went up.
    const latest = useRef<(wished: boolean) => void>(() => undefined);

    const press = (next: boolean) => {
        setError(null);
        // A page drawn again since the last press is the truth to start from.
        if (!flying.current && seen.current !== page) {
            seen.current = page;
            stored.current = { wished: wishedOnPage, id: rowId };
        }
        want.current = next;
        setPressed({ wished: next, id: next && stored.current.wished ? stored.current.id : undefined, on: page });
        onShown?.(next);
        if (flying.current) return;
        flying.current = true;
        startTransition(async () => {
            let failure: string | null = null;
            while (want.current !== stored.current.wished) {
                if (want.current) {
                    const res = await add();
                    if (!res.ok || !res.id) {
                        failure = res.ok ? "The card was added, but this page could not follow. Reload to see it." : res.error;
                        break;
                    }
                    stored.current = { wished: true, id: res.id };
                    notify.done(`${name} is on your wishlist now`, { undo: { onUndo: () => latest.current(false) } });
                } else {
                    const id = stored.current.id;
                    if (!id) {
                        failure = "This wish cannot be changed from here.";
                        break;
                    }
                    const res = await removeCard(id, { reread: false });
                    if (!res.ok) {
                        failure = res.error;
                        break;
                    }
                    stored.current = { wished: false, id: undefined };
                    notify.removed(`${name} is off your wishlist`, { undo: { label: "Put back", onUndo: () => latest.current(true) } });
                }
                onStored?.(stored.current.id);
                if (want.current === stored.current.wished) setPressed({ ...stored.current, on: page });
            }
            flying.current = false;
            if (failure) {
                want.current = stored.current.wished;
                setPressed({ ...stored.current, on: page });
                onShown?.(stored.current.wished);
                onStored?.(stored.current.id);
                setError(failure);
                return;
            }
            await forgetMineQuietly("cards");
        });
    };

    useEffect(() => {
        latest.current = press;
    });

    return { wished: shown.wished, id: shown.id, press, error };
}
