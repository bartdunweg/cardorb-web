"use client";

import type { FC, ReactNode } from "react";
import { ChevronDown } from "@untitledui/icons";
import { Button, type ButtonProps, styles } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

// A button in the list row: Filters, Sort and View. From sm it is icon, word and (for a menu) a
// chevron; on a phone the word is read out only, the chevron is gone and the padding is the
// icon-only padding, so the button is a circle the height of the search pill beside it.
export function RowButton({
    icon,
    label,
    menu = false,
    className,
    children,
    ...props
}: Omit<ButtonProps, "iconLeading" | "iconTrailing" | "children"> & {
    icon: FC<{ className?: string }>;
    label: string;
    /** Opens a menu: a chevron after the word, from sm. */
    menu?: boolean;
    /** After the word: a badge, for one. */
    children?: ReactNode;
}) {
    return (
        <Button
            color="secondary"
            size="sm"
            iconLeading={icon}
            iconTrailing={menu ? <ChevronDown data-icon="trailing" className={cx(styles.common.icon, "max-sm:hidden")} /> : undefined}
            aria-label={label}
            // The kit wraps children in a span with its own padding, beside a gap; with the word read
            // out only, that was 8 px of nothing and a 44 by 36 pill. No text padding and no gap on a
            // phone, the padding back from sm, so the button is a 36 px circle until the word shows.
            noTextPadding
            className={cx("max-sm:gap-0 max-sm:p-2 sm:[&>[data-text]]:px-0.5", className)}
            {...props}
        >
            <span className="max-sm:sr-only">{label}</span>
            {children}
        </Button>
    );
}
