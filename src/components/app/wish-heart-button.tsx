"use client";

import { useTransition } from "react";
import { Heart } from "@untitledui/icons";
import { removeCard, restoreCard } from "@/app/(app)/dashboard/cards/actions";
import { TileIconButton } from "@/components/app/tile-icon-button";
import { notify } from "@/components/app/toast";
import { forgetMineQuietly } from "@/components/app/use-copy-steps";

/**
 * Ours: the heart under a wished card, filled on pink because the card is on the wishlist, and
 * pressed it comes off. The same button a set tile has for a wish, so a wish looks and works the
 * same on the set page and on the wishlist itself.
 *
 * The tile leaves the list at once (`onGone`) and the list is not drawn again: a redrawn list starts
 * over from its first batch. The toast holds the way back.
 */
export function WishHeartButton({ card, onGone }: { card: { id: string; name: string }; onGone: () => void }) {
    const [pending, startTransition] = useTransition();
    return (
        <TileIconButton
            icon={Heart}
            on="wishlist"
            label={`Remove ${card.name} from your wishlist`}
            pending={pending}
            onPress={() =>
                startTransition(async () => {
                    const res = await removeCard(card.id, { reread: false });
                    if (!res.ok) {
                        notify.failed(`${card.name} is still on your wishlist`, { description: res.error });
                        return;
                    }
                    onGone();
                    const removed = res.card;
                    notify.removed(
                        `${card.name} is off your wishlist`,
                        removed ? { undo: { label: "Put back", onUndo: () => void restoreCard(removed) } } : {},
                    );
                    await forgetMineQuietly();
                })
            }
        />
    );
}
