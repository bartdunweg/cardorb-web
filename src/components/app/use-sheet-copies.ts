"use client";

import { useEffect, useRef, useState } from "react";
import { knownRows, rememberCopies } from "@/components/app/card-memo";
import type { Card, PublicCard } from "@/lib/cards";
import { sortCopies } from "@/lib/copies";
import { listCopies } from "@/lib/reads";

type Params = { card: Card | PublicCard | null; readOnly: boolean };

const copiesKey = (c: Card) => `${c.set_name ?? c.set ?? ""}|${c.number ?? ""}|${c.name}`;

/**
 * The card sheet's rows: the one shown, every copy of the card the person holds, and the reads
 * that fill them. `pressedRef` is handed out because the writes count their presses on it too.
 */
export function useSheetCopies({ card, readOnly }: Params) {
    // The owner's fields exist only on the editable view; the public view never receives them.
    // The row the sheet shows: the one it opened on, or another copy of the card tapped in the
    // Copies tile. Kept with the card it was chosen for, so a new card opens on its own row.
    const [viewing, setViewing] = useState<{ of: string; row: Card } | null>(null);
    const mine = readOnly ? null : viewing && card && viewing.of === card.id ? viewing.row : (card as Card | null);
    // Every row of this card the person holds, read when the sheet opens and after each write.
    const [copiesState, setCopiesState] = useState<{ of: string; rows: Card[] } | null>(null);
    /* Before this sheet has read them, the copies the page already had (a set page's rows,
       card-memo.ts), where they include the row shown: then every kind is there on the first paint. */
    const pageCopies = mine?.owned ? knownRows(mine)?.filter((r) => r.owned) : undefined;
    const copies = mine && copiesState?.of === copiesKey(mine) ? copiesState.rows : pageCopies?.some((r) => r.id === mine?.id) ? sortCopies(pageCopies) : null;
    const showRows = (of: Card, rows: Card[]) => setCopiesState({ of: copiesKey(of), rows });
    /* Counts the presses the sheet has answered on screen before the store has. A read that
       started before one of those would put the old number back over the new one, so it is
       dropped; the press that made it stale reads again once its write has landed. */
    const pressed = useRef(0);
    // The card on screen now, for a read that answers after the arrows stepped on to another one.
    const shownCard = useRef(card);
    useEffect(() => {
        shownCard.current = card;
    }, [card]);
    const reloadCopies = async (row: Card | null = mine) => {
        if (!row || !row.owned) return;
        const asOf = pressed.current;
        const readFor = card?.id;
        const rows = sortCopies(await listCopies(row));
        if (asOf !== pressed.current) return;
        rememberCopies(row, rows);
        // A late answer for card A is kept in the memo but does not touch the sheet now showing card B.
        if (shownCard.current?.id !== readFor) return;
        setCopiesState({ of: copiesKey(row), rows });
        /* A row that is gone (removed, merged away, or put back under a new id) cannot stay the one
           shown: the sheet moves to the first row left, so the star and the copy form act on a row
           that exists. */
        const shownId = viewing?.of === card?.id ? viewing?.row.id : row.id;
        if (card && !rows.some((r) => r.id === shownId)) setViewing(rows[0] ? { of: card.id, row: rows[0] } : null);
    };

    // The card's copies, read when a card opens; the list behind hands the sheet one row.
    const opened = !readOnly && (card as Card | null)?.owned ? (card as Card) : null;
    const openedId = opened?.id ?? null;
    useEffect(() => {
        if (!opened) return;
        let live = true;
        const asOf = pressed.current;
        listCopies(opened).then((rows) => {
            if (live && asOf === pressed.current) {
                rememberCopies(opened, rows);
                setCopiesState({ of: copiesKey(opened), rows: sortCopies(rows) });
            }
        });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openedId]);

    return { mine, copies, setViewing, showRows, pressedRef: pressed, reloadCopies };
}
