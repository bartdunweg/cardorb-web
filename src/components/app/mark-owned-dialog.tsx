"use client";

import { type ReactNode, Suspense, lazy } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import type { MarkOwnedProps } from "@/components/app/mark-owned-form";
import { SheetDialog } from "@/components/app/sheet-dialog";

export type { OwnableCard } from "@/components/app/mark-owned-form";

/*
 * The form, and the kit's day picker and @internationalized/date under it, load the first time the
 * dialog opens: every wishlist tile and every set tile carries a Got it, and few are pressed. The
 * trigger and the dialog itself are here from the start, so the press opens it at once, focus goes
 * into it and back to the trigger on close as before. React's `lazy` rather than `next/dynamic`, so
 * what stands in while the form loads can carry the card's name as the dialog's title.
 */
const MarkOwnedForm = lazy(() => import("@/components/app/mark-owned-form").then((m) => ({ default: m.MarkOwnedForm })));

// A wish becomes a copy you hold: the form asks what it is, and saves it.
export function MarkOwnedDialog({ children, ...form }: MarkOwnedProps & { children: ReactNode }) {
    return (
        <SheetDialog
            className="sm:max-w-md"
            content={(close) => (
                <Suspense
                    fallback={
                        // The form's padding and a form's height, named as the form is, so the dialog has its title and its size before the rest arrives.
                        <div className="flex min-h-96 flex-col p-5" aria-busy="true">
                            <AriaHeading slot="title" className="truncate text-lg font-semibold text-primary">
                                {form.card.name}
                            </AriaHeading>
                        </div>
                    }
                >
                    <MarkOwnedForm {...form} close={close} />
                </Suspense>
            )}
        >
            {children}
        </SheetDialog>
    );
}
