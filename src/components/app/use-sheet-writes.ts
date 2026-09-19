"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addCard, editCopies, removeCard, restoreCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import type { EditionChoice, PrintingChoice } from "@/components/app/printing-choices";
import { notify } from "@/components/app/toast";
import type { PokemonCard, RemovedCard } from "@/lib/api-shapes";
import type { Card, PublicCard } from "@/lib/cards";
import type { CopyGroup } from "@/lib/copies";
import { forgetMineQuietly } from "@/lib/forget-mine";
import { settleLatest } from "@/lib/settle-latest";
import { orFailed } from "@/lib/write-outcome";

type Params = {
    card: Card | PublicCard | null;
    readOnly: boolean;
    mine: Card | null;
    copies: Card[] | null;
    showRows: (of: Card, rows: Card[]) => void;
    setViewing: (viewing: { of: string; row: Card } | null) => void;
    pressedRef: RefObject<number>;
    reloadCopies: (row?: Card | null) => Promise<void>;
    binder: { id: string; name: string } | null;
    printing: PrintingChoice | null;
    edition: EditionChoice["key"] | null;
    addable: PokemonCard | null | undefined;
    onClose: () => void;
    onTaken?: (card: PokemonCard, list: "collection" | "wishlist", id: string | undefined) => void;
    onTaking?: (card: PokemonCard, list: "collection" | "wishlist") => (() => void) | void;
    onRemoved?: (row: Card) => void;
};

/**
 * Everything the card sheet writes: taking a card, filing it, the copy stepper, removing and
 * putting back, and the one refresh of the list behind that a run of those writes shares.
 */
export function useSheetWrites({
    card,
    readOnly,
    mine,
    copies,
    showRows,
    setViewing,
    pressedRef,
    reloadCopies,
    binder,
    printing,
    edition,
    addable,
    onClose,
    onTaken,
    onTaking,
    onRemoved,
}: Params) {
    const router = useRouter();
    /* A card the sheet has just emptied stays on screen as a card you could take again, so the
       last minus is not a door slamming. The set page hands one of these in; everywhere else the
       card on screen is enough to build it. */
    const [removed, setRemoved] = useState<string | null>(null);
    const emptied = !!card && removed === card.id;
    // The dots menu's actions: each one server call, then the page re-reads; removing closes the sheet
    // first, since the card it showed is gone.
    const [busy, setBusy] = useState(false);
    /* The list behind the sheet re-reads after a write, but not after each one: a run of presses
       is one change to it, and a re-read per press had every one of them competing with the next
       write for the same connection. Closing the sheet takes whatever is still waiting with it. */
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleRefresh = () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
            refreshTimer.current = null;
            router.refresh();
        }, 500);
    };
    /* Gone with the page it was on: a re-read still waiting would refresh the page that came next, and
       in a test file it fired in the test after the one that asked for it (the rapid-star test, CI). */
    useEffect(
        () => () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
        },
        [],
    );
    const flushRefresh = () => {
        if (!refreshTimer.current) return;
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
        router.refresh();
    };

    /* A line is a kind of copy, so the bin on it removes every row behind it. Removing one of four
       identical rows would leave a line still saying ×3 and nothing to show for the press. */
    const dropCopies = async (group: Card[]) => {
        if (!mine || !card || !group.length) return;
        /* Gone from the panel at once; the store follows. A failure reads the rows back. */
        const gone = new Set(group.map((r) => r.id));
        const rows = (copies ?? [mine]).filter((r) => !gone.has(r.id));
        pressedRef.current += 1;
        showRows(mine, rows);
        if (gone.has(mine.id) && rows[0]) setViewing({ of: card.id, row: rows[0] });
        setBusy(true);
        /* At once, not one after another. Each of these is a round trip from the browser through
           the app to the API and on to the database in another region, so a group of four in a
           `for await` was four of those in a queue: the wait grew with the number of copies, on
           the one action where the number of copies is the whole point. They touch different rows,
           so nothing is racing. None of them forgets (reread: false): each forgetting in its own
           answer drew the page again once per copy, and those redraws queued behind one another.
           The cache is dropped once, quietly, when they have all landed, failed ones included,
           since the others may still have removed their rows. */
        const results = await Promise.all(group.map((row) => orFailed(removeCard(row.id, { reread: false }))));
        setBusy(false);
        const forgotten = forgetMineQuietly("cards");
        const failed = results.find((r) => !r.ok);
        if (failed && !failed.ok) {
            notify.failed(group.length > 1 ? "Those copies were not removed" : "That copy was not removed", { description: failed.error });
            void forgotten.then(() => {
                scheduleRefresh();
                void reloadCopies();
            });
            return;
        }
        offerUndo(
            results.flatMap((r) => (r.ok && r.card ? [r.card] : [])),
            group.length > 1 ? `${group.length} copies removed` : "Copy removed",
        );
        // Nothing left: the sheet says so, rather than staying on a row that is gone with "Add a
        // copy" and the star still writing to it. Only the minus's own path said it before.
        if (!rows.length && card) setRemoved(card.id);
        void forgotten.then(scheduleRefresh);
    };
    /* Read-only sheets never take a card, so the public shape is not asked to answer for one. */
    const own = readOnly ? null : (card as Card | null);
    const takeable: PokemonCard | null =
        addable ??
        (own
            ? {
                  id: own.id,
                  name: own.name,
                  // The official name: what every catalogue add sends, and what a new row is filed under.
                  set: own.set_name ?? own.set ?? "",
                  number: own.number ?? "",
                  rarity: own.rarity,
                  image: own.image_url,
                  supertype: null,
                  subtypes: null,
                  hp: null,
                  types: own.types?.length ? own.types : null,
                  artist: null,
                  series: null,
                  releaseDate: null,
                  setPrintedTotal: null,
                  flavorText: null,
                  nationalPokedexNumbers: null,
                  owned: false,
                  wishlist: false,
                  quantity: 0,
                  price: own.price,
                  listingPrice: own.listing_price ?? null,
              }
            : null);

    /* Taking a card the sheet was only showing. The sheet closes on the press, with the toast, and
       the write follows: it waited for the write and then for the list behind to be drawn again, a
       spinner on a card already chosen. What it was showing is not what it is now, and the row it
       became has its own copies. A write that fails says so; nothing was marked, so nothing goes back. */
    const add = (list: "collection" | "wishlist") => {
        if (!takeable) return;
        const taken = takeable;
        const into = list === "collection" ? binder : null;
        const where = list === "wishlist" ? "your wishlist" : into ? into.name : "your collection";
        setRemoved(null);
        onClose();
        notify.done(`Added to ${where}`, { description: taken.name });
        const putBack = onTaking?.(taken, list);
        /* The printing and run pressed under the card, where the sheet offers a choice (Bart,
           2026-09-15): you add the one you are looking at. Otherwise the API's own default. */
        void orFailed(
            addCard(taken, list, into?.id, {
                printing: printing ? { finish: printing.finish, foilPattern: printing.foilPattern } : undefined,
                edition: edition ?? undefined,
                reread: false,
            }),
        ).then((res) => {
            if (!res.ok) {
                notify.failed(`That card was not added to ${where}`, { description: res.error });
                putBack?.();
                return;
            }
            // The write forgot nothing (reread: false), so a refresh on its own drew the sidebar's
            // counts from the cache as they were before the add.
            const forgotten = forgetMineQuietly("cards");
            if (onTaken) onTaken(taken, list, res.id);
            else void forgotten.then(() => router.refresh());
        });
    };
    /* A card you hold, into the binder this page is: the first row not yet in a binder, else the
       row shown, which then moves. A row is one kind of copy, so ×4 goes as four, as the Binder
       select on a copy does it. Only a row the store has answered with: a sheet opened from the
       palette shows the catalogue's card until its rows land, and that card's id is no row's. */
    /* Filed on the press: the row says the binder at once, so the button and the chip under "In
       binders" trade places under the finger, and the write follows. It used to hold every button
       in the sheet through the write and the list behind drawn inside the action's answer. A write
       that fails puts the rows back and says so. */
    const fileInBinder = () => {
        if (!mine || !binder || !copies?.length) return;
        const into = binder;
        const before = copies;
        const row = copies.find((r) => r.collection_id === null) ?? copies[0];
        pressedRef.current += 1;
        showRows(
            mine,
            copies.map((r) => (r.id === row.id ? { ...r, collection_id: into.id } : r)),
        );
        notify.done(`Added to ${into.name}`, { description: row.collection_id ? "Moved from another binder" : mine.name });
        void orFailed(editCopies([row.id], { collectionId: into.id }, { reread: false })).then((res) => {
            if (!res.ok) {
                pressedRef.current += 1;
                showRows(mine, before);
                notify.failed(`${mine.name} was not added to ${into.name}`, { description: res.error });
                return;
            }
            void forgetMineQuietly("cards").then(() => {
                scheduleRefresh();
                void reloadCopies();
            });
        });
    };

    /* How many of a kind. Plus adds one to the row on screen for it. Minus takes one from a row
       that holds more than one, and otherwise drops a whole row of the kind, since four identical
       copies are four rows of one in the store. The last one may go: the panel answers at once
       with the two ways to take it back.

       The number changes under the finger. It used to wait for the write to land in another
       region and then for the rows to be read back, two round trips, with the button looking
       dead in between. Now the panel shows the new count and the store catches up: one write in
       the air per row, always for the last count pressed, and the rows are read back once it has
       landed. A write that fails puts the store's number back and says so. */
    const [settleQuantity] = useState(() => settleLatest((id: string, quantity: number) => orFailed(setCopies(id, quantity, { reread: false }))));
    const showQuantity = (row: Card, quantity: number) => {
        if (!mine) return;
        pressedRef.current += 1;
        const base = copies ?? [mine];
        showRows(
            mine,
            base.map((r) => (r.id === row.id ? { ...r, quantity } : r)),
        );
        void settleQuantity(row.id, quantity, (error) => {
            notify.failed("The number of copies did not change", { description: error });
        }).then((landed) => {
            // null is a press folded into one still flying; that one re-reads for both. The
            // writes forget nothing themselves (setCopies, reread: false): the cache is dropped
            // here, once, when no write is in the air to race the re-read that fills it again.
            // A failed run may still have landed its first presses, so it re-reads too.
            if (landed === null) return;
            // Quietly, through the route: rereadMine() is an action, and a cache dropped inside one
            // draws the page again in its answer, a redraw of the list behind the sheet on top of the
            // refresh this schedules.
            void forgetMineQuietly("cards").then(() => {
                scheduleRefresh();
                void reloadCopies();
            });
        });
    };
    const stepUp = (group: CopyGroup) => {
        const row = group.shown;
        showQuantity(row, (row.quantity ?? 1) + 1);
    };
    const stepDown = async (group: CopyGroup) => {
        const many = group.rows.find((r) => (r.quantity ?? 1) > 1);
        if (many) return showQuantity(many, (many.quantity ?? 1) - 1);
        // Any row but the one the sheet opened on, so what it shows stays as long as it can.
        const spare = group.rows.find((r) => r.id !== mine?.id) ?? group.rows[0];
        if (!spare) return;
        await dropCopies([spare]);
    };

    const closeSheet = async () => {
        flushRefresh();
        // The next card, or this one again, opens on its own row.
        setViewing(null);
        onClose();
    };
    /* A way back that puts the row back whole. The rows live only in this closure, for as long as
       the toast is up: the API keeps nothing, so an undo nobody presses costs nothing and leaves
       nothing behind. An API that has not deployed the change yet hands back no row, and then
       there is nothing to offer: the removal stands and says so without an Undo, which is better
       than a button that would quietly create a card missing everything it held. */
    const offerUndo = (rows: RemovedCard[], done: string) => {
        if (!rows.length) return notify.removed(done);
        notify.removed(done, {
            undo: {
                label: "Put back",
                onUndo: () => {
                    // Forgotten once for the lot, quietly, as the removal was (dropCopies says why).
                    void Promise.all(rows.map((row) => orFailed(restoreCard(row, { reread: false })))).then(async (results) => {
                        const failed = results.find((r) => !r.ok);
                        if (failed && !failed.ok) notify.failed("That did not go back", { description: failed.error });
                        else {
                            setRemoved(null);
                            notify.done(rows.length > 1 ? `${rows.length} copies are back` : "It is back");
                        }
                        await forgetMineQuietly("cards");
                        scheduleRefresh();
                        void reloadCopies();
                    });
                },
            },
        });
    };

    /* Closed on the press and written after, as the add is: the sheet waited for the delete and the
       redraw with its menu spinning. The toast comes with the answer, because its way back is the row
       the delete hands back. */
    const removeAndOffer = (row: Card) => {
        const wishlist = !!row.wishlist;
        onClose();
        onRemoved?.(row);
        void orFailed(removeCard(row.id, { reread: false })).then((res) => {
            if (!res.ok) {
                notify.failed(wishlist ? "That card is still on your wishlist" : "That card is still in your collection", { description: res.error });
                router.refresh();
                return;
            }
            const forgotten = forgetMineQuietly("cards");
            if (!onRemoved) void forgotten.then(() => router.refresh());
            offerUndo(res.card ? [res.card] : [], wishlist ? "Removed from your wishlist" : "Removed from your collection");
        });
    };

    return { takeable, emptied, busy, scheduleRefresh, add, fileInBinder, dropCopies, stepUp, stepDown, closeSheet, removeAndOffer };
}
