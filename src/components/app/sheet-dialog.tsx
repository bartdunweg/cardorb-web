"use client";

import type { ReactNode } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { cx } from "@/utils/cx";

/**
 * A dialog that is a sheet from the bottom on a phone and a modal from `sm`.
 *
 * It exists because two dialogs that describe a copy — the one that adds or splits one, the one
 * that takes a card off the wishlist — were drawn on nothing at all. The kit's `Modal` positions
 * and animates; it paints no surface, and every dialog in this app that looks right paints its
 * own (`folder-dialog`, and the Add dialog that has since gone, both `rounded-2xl glass-thick p-6 shadow-xl`). Those
 * two did not, so their labels floated over the page behind them, unreadable.
 *
 * Fixing it twice would have left the same trap for the third one, and the shape belongs to the
 * app rather than to either dialog: a phone reaches the bottom of its screen and a desktop does
 * not, so the sheet is where a form somebody is filling in should be.
 *
 * CSS rather than a breakpoint hook, unlike `FilterChip`, which genuinely renders two different
 * things (a popover under a chip, or a slideout). This is one dialog in two positions, so one
 * tree with `max-sm:` on it keeps the trigger, the focus trap and the Escape behaviour identical
 * at every width — and there is no frame at which the two disagree about whether it is open.
 */
export function SheetDialog({
    children,
    content,
    className,
    defaultOpen = false,
}: {
    /** The trigger. A react-aria pressable — the kit's `Button` is one. */
    children: ReactNode;
    /** The dialog's own content; `close` shuts it. */
    content: (close: () => void) => ReactNode;
    /** The modal's width from `sm`. A sheet is always the screen's width. */
    className?: string;
    /** Open on arrival, for a page reached for what the sheet holds. Uncontrolled after that. */
    defaultOpen?: boolean;
}) {
    return (
        <DialogTrigger defaultOpen={defaultOpen}>
            {children}
            {/* Bottom-aligned and flush on a phone: a sheet is attached to the edge, not floating near it. */}
            <ModalOverlay className="max-sm:items-end max-sm:p-0">
                <Modal
                    className={(state) =>
                        cx(
                            "max-sm:max-h-[85dvh]",
                            // The kit zooms a modal in. A sheet rises, which is what the app's
                            // other sheets do (slideout-menu.tsx) and what a phone expects.
                            state.isEntering && "max-sm:slide-in-from-bottom max-sm:zoom-in-100 max-sm:motion-reduce:slide-in-from-bottom-0",
                            state.isExiting && "max-sm:slide-out-to-bottom max-sm:zoom-out-100 max-sm:motion-reduce:slide-out-to-bottom-0",
                            className,
                        )
                    }
                >
                    <Dialog>
                        {({ close }) => (
                            /*
                             * The surface. `glass-thick` and the corners are what folder-dialog
                             * already draws; a sheet keeps only its top corners and
                             * clears the home indicator.
                             */
                            <div className="flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-2xl glass-thick shadow-xl max-sm:max-h-[85dvh] max-sm:rounded-b-none max-sm:pb-safe">
                                {content(close)}
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
