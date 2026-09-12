"use client";

import { useState } from "react";
import { Check } from "@untitledui/icons";
import { type CardFacts, cardFacts } from "@/app/(app)/dashboard/cards/actions";
import { type FolderChoice, listCollections } from "@/app/(app)/dashboard/collections/actions";
import { MarkOwnedDialog, type OwnableCard } from "@/components/app/mark-owned-dialog";
import { TileIconButton } from "@/components/app/tile-icon-button";

/**
 * Ours: the one thing a wishlist tile can do, on the tile. "Got it" opens the same form the card
 * sheet opens (language, condition, folder, price, the day), so a card that arrived in the post
 * leaves the wishlist without opening the sheet first. A round check under the price, the size and
 * the place of a set tile's plus, so the buttons under a card are one size on every list. Instacart's saved lists and Etsy's
 * favourites carry an item's one action on the item itself; this is that.
 *
 * The form's folders and the catalogue's facts are asked for on the press that opens it, not
 * when the list draws: a wishlist of forty tiles must not ask the API forty times for a form
 * nobody has opened. They arrive while the form is on screen, as they do in the sheet.
 */
export function GotItButton({ card }: { card: OwnableCard }) {
    const [folders, setFolders] = useState<FolderChoice[] | null>(null);
    // The catalogue's answer, once asked: null is an answer too (nothing known), so the asking
    // is what is remembered.
    const [facts, setFacts] = useState<{ facts: CardFacts | null } | null>(null);

    const load = () => {
        if (folders === null) void listCollections().then(setFolders);
        if (facts === null && card.tcg_id) void cardFacts(card.tcg_id).then((f) => setFacts({ facts: f }));
    };

    return (
        <MarkOwnedDialog card={card} folders={folders ?? []} languages={facts?.facts?.languages} facts={facts?.facts}>
            <TileIconButton icon={Check} label={`Got it: ${card.name}`} onPress={load} />
        </MarkOwnedDialog>
    );
}
