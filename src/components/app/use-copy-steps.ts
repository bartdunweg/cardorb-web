"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { removeCard, rereadMine, restoreCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import { useLatestPress } from "@/components/app/use-latest-press";
import type { RemovedCard } from "@/lib/api-shapes";
import { forgetMineQuietly } from "@/lib/forget-mine";
import { orFailed } from "@/lib/write-outcome";

type Added = { ok: true; id?: string } | { ok: false; error: string };

/**
 * A copy more or a copy less, from the plus and the minus under a card tile.
 *
 * The count changes under the finger. A press used to wait for the write and then for the whole
 * page to be drawn again, twice, with every button disabled in between: on 2026-09-12 one add set
 * off twenty API reads that took sixteen seconds. Now the tile shows the new count at once and the
 * store follows (`useLatestPress`): one write in the air at a time, always for the last count
 * pressed, and one re-read once the presses have landed. The tile believes its own count until the
 * page it sits on has changed: two plus presses once made four copies.
 *
 * `add` is how a card nobody holds becomes a row (a set tile has it; a list's row already is one).
 * The minus on the last copy removes the row, with the way back in the toast.
 *
 * `quiet` is for a list: the re-read drops the cache without drawing the page again, because a
 * redrawn list starts over from its first batch. Such a tile keeps its own count until you leave.
 */
export function useCopySteps({
    name,
    set = null,
    held: heldOnPage,
    rowId,
    add,
    quiet = false,
    onShown,
    onStored,
}: {
    /** The card's name, for the toasts. */
    name: string;
    /**
     * The set the card is in, where the tile knows it: then the forget drops that set's page alone
     * and every other set page keeps its five minutes. Null drops them all, as it always did.
     */
    set?: string | null;
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
    const router = useRouter();
    const buttons = useRef<HTMLDivElement>(null);
    const steps = useLatestPress<number>({
        value: heldOnPage,
        id: rowId,
        write: async ({ value: have, id }, target) => {
            if (have === 0) {
                const res = add ? await add() : ({ ok: false, error: "This card cannot be added from here." } as const);
                if (!res.ok || !res.id) return { failure: res.ok ? "The card was added, but this page could not follow. Reload to see it." : res.error };
                const added = res.id;
                // The press that loses nothing but may be a thumb one tile off: said, with the way back.
                notify.done(`${name} is in your collection now`, { undo: { onUndo: () => undoAdd(added) } });
                return { value: 1, id: added };
            }
            if (target === 0 && id) {
                const res = await removeCard(id, { reread: false });
                if (!res.ok) return { failure: res.error };
                const removed = res.card;
                notify.removed(`${name} is out of your collection`, removed ? { undo: { label: "Put back", onUndo: () => putBack(removed) } } : {});
                return { value: 0, id: undefined };
            }
            if (id) {
                const res = await setCopies(id, target, { reread: false });
                return res.ok ? { value: target, id } : { failure: res.error };
            }
            // Held, but no row to write to: a run that stopped short of the press re-read the page for ever.
            return { failure: "This copy cannot be changed from here." };
        },
        settle: () => (quiet ? forgetMineQuietly("cards", set) : rereadMine()),
        onStored: onStored && (({ value, id }) => onStored(value, id)),
        onFailed: ({ error, wanted, stored }) => {
            onShown?.(wanted, stored.value);
            return error;
        },
    });
    const held = steps.value;

    const press = (quantity: number) => {
        /* Holding the card or no longer holding it swaps the buttons, so the one a keyboard was on
           can be gone: focus goes to the last button, the plus, once it is drawn. */
        if ((held === 0) !== (quantity === 0) && buttons.current?.contains(document.activeElement)) {
            requestAnimationFrame(() => [...(buttons.current?.querySelectorAll("button") ?? [])].at(-1)?.focus());
        }
        onShown?.(held, quantity);
        steps.press(quantity);
    };

    /* "Put back" on a copy the minus took to nought. On a list the write forgets nothing itself: a
       restore that dropped the cache inside its action drew the page again in the answer, and the
       list under the toast was redrawn with it. The row comes back with a new id, so the list is
       read again once the cache is gone, which keeps its scrolled batches (`cards-list.tsx`). */
    const putBack = (removed: RemovedCard) => {
        if (!quiet) {
            return void orFailed(restoreCard(removed)).then((res) => {
                if (!res.ok) notify.writeFailed("That did not go back", res);
            });
        }
        void orFailed(restoreCard(removed, { reread: false })).then((res) => {
            if (!res.ok) return notify.writeFailed("That did not go back", res);
            void forgetMineQuietly("cards", set).then(() => router.refresh());
        });
    };

    /* Undo on "in your collection now". It removed the row and left the tile as it was: the tile
       believes what it pressed until the page it sits on is a different one, and a set page drawn
       after the undo holds what it held before the add, the same page. So the tile said "in your
       collection" and a minus wrote to a row that was gone. The tile goes to nought at once now, and
       the row is removed quietly with the page read again after, as Put back does.
       The row is forgotten only once the removal answers: one that fails puts the tile back on the
       row it still has, rather than a tile saying nought whose plus adds a second row. A press made
       while the removal flies waits for it and then goes on from what it left.
       A write still in the air (a plus pressed again after the add) is left to finish the way a minus
       to nought would, rather than the row removed twice and one of the two refused.
       An older toast's Undo, for a row the tile is no longer on (taken off and put back under a new
       id), removes nothing and leaves the tile alone. */
    const undoAdd = (added: string) => {
        const { stored: before, flying } = steps.current();
        if (before.id !== added) return void notify.failed("That can no longer be undone", { description: `${name} has changed since.` });
        const { wanted } = steps.aim(0);
        onShown?.(wanted, 0);
        if (flying) return;
        void steps.aside(async () => {
            const r = await orFailed(removeCard(added, { reread: !quiet }));
            if (!r.ok) {
                // Still on the row it had, unless a press has moved the tile on since.
                if (steps.current().wanted === 0) {
                    steps.aim(before.value);
                    onShown?.(0, before.value);
                }
                return void notify.writeFailed("That did not go back", r);
            }
            steps.keep({ value: 0, id: undefined });
            notify.done("Undone");
            if (quiet) void forgetMineQuietly("cards", set).then(() => router.refresh());
        });
    };

    return { held, press, error: steps.error, buttons };
}
