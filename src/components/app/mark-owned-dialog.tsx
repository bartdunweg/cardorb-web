"use client";

import { Component, type ReactNode, Suspense, lazy, useState } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import type { MarkOwnedProps } from "@/components/app/mark-owned-form";
import { SheetDialog } from "@/components/app/sheet-dialog";
import { Button } from "@/components/base/buttons/button";

export type { OwnableCard } from "@/components/app/mark-owned-form";

/*
 * The form, and the kit's day picker and @internationalized/date under it, load the first time the
 * dialog opens: every wishlist tile and every set tile carries a Got it, and few are pressed. The
 * trigger and the dialog itself are here from the start, so the press opens it at once, focus goes
 * into it and back to the trigger on close as before. React's `lazy` rather than `next/dynamic`, so
 * what stands in while the form loads can carry the card's name as the dialog's title.
 */
const lazyForm = () => lazy(() => import("@/components/app/mark-owned-form").then((m) => ({ default: m.MarkOwnedForm })));
/* One for every dialog, so the chunk is asked for once. A failed load is kept by `lazy` for good,
   so Try again makes a new one, which asks for the chunk again. */
let MarkOwnedForm = lazyForm();

/*
 * The chunk can fail to arrive: a deploy between the page load and the press takes the old file
 * away, or the connection is gone. Without a boundary here that throw reached (app)/error.tsx and
 * took the whole page with it for one dialog. It stays in the dialog, says so, and tries again.
 */
class FormLoadBoundary extends Component<{ title: string; onRetry: () => void; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="flex flex-col gap-5 p-5" role="alert">
                <div className="flex flex-col gap-1">
                    <AriaHeading slot="title" className="truncate text-lg font-semibold text-primary">
                        {this.props.title}
                    </AriaHeading>
                    <p className="text-sm text-tertiary">This form couldn&apos;t load. Check your connection and try again.</p>
                </div>
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={() => {
                            this.setState({ failed: false });
                            this.props.onRetry();
                        }}
                    >
                        Try again
                    </Button>
                </div>
            </div>
        );
    }
}

function LoadedForm(form: MarkOwnedProps & { close: () => void }) {
    const [, setAttempt] = useState(0);
    return (
        <FormLoadBoundary
            title={form.card.name}
            onRetry={() => {
                MarkOwnedForm = lazyForm();
                setAttempt((n) => n + 1);
            }}
        >
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
                <MarkOwnedForm {...form} />
            </Suspense>
        </FormLoadBoundary>
    );
}

// A wish becomes a copy you hold: the form asks what it is, and saves it.
export function MarkOwnedDialog({ children, ...form }: MarkOwnedProps & { children: ReactNode }) {
    return (
        <SheetDialog className="sm:max-w-md" content={(close) => <LoadedForm {...form} close={close} />}>
            {children}
        </SheetDialog>
    );
}
