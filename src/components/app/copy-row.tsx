"use client";

import { Button as AriaButton } from "react-aria-components";
import { FlagIcon } from "@/components/app/flag-icon";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

/**
 * Ours: one line of the Copies panel in a card's sheet — the language's flag, what kind of copy it
 * is, what one is worth and how many you hold — pressed to show that kind in the fields below.
 *
 * The kit has no clickable row: its table rows are cells, and a list item that is itself the control
 * is not a shape it draws. What the line says is worked out by the sheet, which knows the finish,
 * the grade and the binder; the row only draws it and takes the press.
 */
export function CopyRow({
    language,
    label,
    price,
    quantity,
    current,
    onSelect,
}: {
    /** Not recorded reads as English, which nearly every card is; FlagIcon settles that. */
    language: string | null | undefined;
    /** What kind of copy this is: "Holo · Cosmos · Near Mint · Binder", or "Copy" when nothing is recorded. */
    label: string;
    /** This kind's own price: a reverse holo has the foil's, the rest the plain one. */
    price?: number | null;
    quantity: number;
    /** The kind the sheet is showing. */
    current: boolean;
    onSelect: () => void;
}) {
    return (
        <AriaButton
            aria-current={current ? "true" : undefined}
            onPress={onSelect}
            className={cx(
                "flex w-full items-center gap-2 py-2 text-left text-sm outline-focus-ring focus-visible:outline-2",
                current ? "text-primary" : "text-secondary hover:text-primary",
            )}
        >
            <FlagIcon language={language} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {price != null ? <span className="text-tertiary tabular-nums">{formatPrice(price)}</span> : null}
            <span className="text-tertiary tabular-nums">×{quantity}</span>
        </AriaButton>
    );
}
