"use client";

import { Plus } from "@untitledui/icons";
import { type AddIntent, useCommandSearch } from "@/components/app/command-search";
import { Button } from "@/components/base/buttons/button";

/**
 * Add card, on a page: opens the one palette (cmd+K, the sidebar's Search) with the page's side of
 * the choice made — see `AddIntent`. It replaced a dialog of its own that searched the same
 * catalogue with fewer filters, no preview and no price line.
 */
export function AddCardButton({
    target = "collection",
    collectionId,
    collectionName,
    compact = false,
    label = "Add card",
}: {
    target?: AddIntent["target"];
    /** Opened from a manual binder's page: the card is filed in it at once. */
    collectionId?: string;
    collectionName?: string;
    /** The plus alone, the size of Back: it sits in the phone's bar beside it. */
    compact?: boolean;
    label?: string;
}) {
    const { open } = useCommandSearch();
    const intent: AddIntent = { target, collectionId, collectionName };
    return compact ? (
        <Button iconLeading={Plus} size="lg" aria-label={label} onClick={() => open(intent)} />
    ) : (
        <Button iconLeading={Plus} size="md" onClick={() => open(intent)}>
            {label}
        </Button>
    );
}
