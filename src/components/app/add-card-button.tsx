"use client";

import { Plus } from "@untitledui/icons";
import { type AddList, useCommandSearch } from "@/components/app/command-search";
import { Button } from "@/components/base/buttons/button";

/**
 * Add card, on a page: opens the one palette, the same one cmd+K and the sidebar's Search open
 * (Bart's call, 2026-09-11: one function, no difference in the interface). It replaced a dialog
 * of its own that searched the same catalogue with fewer filters and no sheet. The one thing a
 * page passes along is its list: on the wishlist the preview leads with Add to wishlist, so the
 * button and the palette promise the same thing.
 */
export function AddCardButton({ compact = false, label = "Add card", list }: { compact?: boolean; label?: string; list?: AddList }) {
    const { open } = useCommandSearch();
    const press = () => open({ list });
    return compact ? (
        // The plus alone, the size of Back: it sits in the phone's bar beside it.
        <Button iconLeading={Plus} size="lg" aria-label={label} onClick={press} />
    ) : (
        <Button iconLeading={Plus} size="md" onClick={press}>
            {label}
        </Button>
    );
}
