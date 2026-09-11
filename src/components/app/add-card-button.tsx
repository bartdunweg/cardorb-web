"use client";

import { Plus } from "@untitledui/icons";
import { useCommandSearch } from "@/components/app/command-search";
import { Button } from "@/components/base/buttons/button";

/**
 * Add card, on a page: opens the one palette, the same one cmd+K and the sidebar's Search open,
 * with nothing preset — Bart's call, 2026-09-11: one function, no difference in the interface. It
 * replaced a dialog of its own that searched the same catalogue with fewer filters and no sheet.
 */
export function AddCardButton({ compact = false, label = "Add card" }: { compact?: boolean; label?: string }) {
    const { open } = useCommandSearch();
    return compact ? (
        // The plus alone, the size of Back: it sits in the phone's bar beside it.
        <Button iconLeading={Plus} size="lg" aria-label={label} onClick={open} />
    ) : (
        <Button iconLeading={Plus} size="md" onClick={open}>
            {label}
        </Button>
    );
}
