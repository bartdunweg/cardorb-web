"use client";

import { useRef, useState, useTransition } from "react";
import { removeCard, rereadMine, restoreCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import { holdPage } from "@/lib/unsent-writes";

type Added = { ok: true; id?: string } | { ok: false; error: string };

/**
 * A copy more or a copy less, from the plus and the minus under a card tile.
 *
 * The count changes under the finger. A press used to wait for the write and then for the whole
 * page to be drawn again, twice, with every button disabled in between: on 2026-09-12 one add set
 * off twenty API reads that took sixteen seconds. Now the tile shows the new count at once and the
 * store follows: one write in the air at a time, always for the last count pressed, and one
 * re-read once the presses have landed.
 *
 * The tile believes its own count until the page it sits on has changed. An action answers before
 * the page it streams, so a press in between read "not held" from the page and added the card
 * again (every add is a new row): two plus presses made four copies. So `stored` is what this
 * tile last wrote, and the page is taken over it only once the page is a different one.
 *
 * `add` is how a card nobody holds becomes a row (a set tile has it; a list's row already is one).
 * The minus on the last copy removes the row, with the way back in the toast.
 *
 * `quiet` is for a list: the re-read drops the cache without drawing the page again, because a
 * redrawn list starts over from its first batch. Such a tile keeps its own count until you leave.
 */
export function useCopySteps({
    name,
    held: heldOnPage,
    rowId,
    add,
    quiet = false,
    onShown,
    onStored,
}: {
    /** The card's name, for the toasts. */
    name: string;
    /** How many the page says are held; 0 for a card with no row. */
    held: number;
    /** The row the copies are on, where there is one. */
    rowId: string | undefined;
    add?: () => Promise<Added>;
    quiet?: boolean;
    /** Every change to the count this tile shows, from and to: a list's line under its title follows it. */
    onShown?: (from: number, to: number) => void;
    /** What the store holds after each write: the count and its row. A set page keeps it for a tile drawn again. */
    onStored?: (quantity: number, id: string | undefined) => void;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const page = `${heldOnPage}:${rowId ?? ""}`;
    // The last count pressed, and the page it was pressed on.
    const [pressed, setPressed] = useState<{ quantity: number; on: string } | null>(null);
    const held = pressed && (pending || pressed.on === page) ? pressed.quantity : heldOnPage;
    const want = useRef(heldOnPage);
    const flying = useRef(false);
    const stored = useRef<{ quantity: number; id: string | undefined }>({ quantity: heldOnPage, id: rowId });
    const seen = useRef<string | null>(null);
    const buttons = useRef<HTMLDivElement>(null);

    const press = (quantity: number) => {
        setError(null);
        /* Holding the card or no longer holding it swaps the buttons, so the one a keyboard was on
           can be gone: focus goes to the last button, the plus, once it is drawn. */
        if ((held === 0) !== (quantity === 0) && buttons.current?.contains(document.activeElement)) {
            requestAnimationFrame(() => [...(buttons.current?.querySelectorAll("button") ?? [])].at(-1)?.focus());
        }
        setPressed({ quantity, on: page });
        onShown?.(held, quantity);
        want.current = quantity;
        if (flying.current) return;
        flying.current = true;
        if (!pending && seen.current !== page) {
            seen.current = page;
            if (!pressed || pressed.on !== page) stored.current = { quantity: heldOnPage, id: rowId };
        }
        let { quantity: have, id } = stored.current;
        // A press waiting on the write before it lives only in this page: a reload now would drop it.
        const release = holdPage();
        startTransition(async () => {
            let failure: string | null = null;
            try {
                do {
                    while (want.current !== have) {
                        const target = want.current;
                        if (have === 0) {
                            const res = add ? await add() : ({ ok: false, error: "This card cannot be added from here." } as const);
                            if (!res.ok || !res.id) {
                                failure = res.ok ? "The card was added, but this page could not follow. Reload to see it." : res.error;
                                break;
                            }
                            const added = res.id;
                            id = added;
                            // The press that loses nothing but may be a thumb one tile off: said, with the way back.
                            notify.done(`${name} is in your collection now`, {
                                undo: {
                                    onUndo: () =>
                                        void removeCard(added).then((r) =>
                                            r.ok ? notify.done("Undone") : notify.failed("That did not go back", { description: r.error }),
                                        ),
                                },
                            });
                        } else if (target === 0 && id) {
                            const res = await removeCard(id, { reread: false });
                            if (!res.ok) {
                                failure = res.error;
                                break;
                            }
                            const removed = res.card;
                            id = undefined;
                            notify.removed(
                                `${name} is out of your collection`,
                                removed ? { undo: { label: "Put back", onUndo: () => void restoreCard(removed) } } : {},
                            );
                        } else if (id) {
                            const res = await setCopies(id, target, { reread: false });
                            if (!res.ok) {
                                failure = res.error;
                                break;
                            }
                        } else {
                            // Held, but no row to write to: a break here left `have` behind `want`, and the
                            // outer loop re-read the page for ever.
                            failure = "This copy cannot be changed from here.";
                            break;
                        }
                        have = have === 0 ? 1 : target;
                        stored.current = { quantity: have, id };
                        onStored?.(have, id);
                    }
                    // Once, with nothing in the air to race it; a press during the re-read goes round again.
                    await (quiet ? forgetMineQuietly() : rereadMine());
                } while (!failure && want.current !== have);
            } catch {
                // An action that threw (no signal, a deploy in between) is a failure like a refused one.
                failure = "Something went wrong. Try again.";
            } finally {
                release();
            }
            flying.current = false;
            if (failure) {
                onShown?.(want.current, have);
                want.current = have;
                setPressed({ quantity: have, on: page });
                setError(failure);
            }
        });
    };

    return { held, press, error, buttons };
}

/**
 * The cache forgotten without the page drawn again (`/api/forget-mine`). Best effort: a list that
 * could not forget still shows the right count, and the cache holds the old one five minutes at most.
 */
export const forgetMineQuietly = () =>
    fetch("/api/forget-mine", { method: "POST" }).then(
        () => void window.dispatchEvent(new Event(CARDS_CHANGED)),
        () => undefined,
    );

/** Said on the window once a quiet write's cache is gone, for what reads its own numbers again (the sidebar). */
export const CARDS_CHANGED = "cardorb:cards-changed";
