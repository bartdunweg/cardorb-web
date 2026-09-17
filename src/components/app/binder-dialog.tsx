"use client";

import { Component, type ComponentType, type ReactNode, Suspense, lazy, useState } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import type { BinderKind, BinderRule, PokedexSetting } from "@/lib/binder-rule";
import type { Facets } from "@/lib/facets";

export type BinderShape = { id: string; name: string; kind: BinderKind; rule: BinderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };
export type BinderFormProps = {
    mode: "create" | "edit";
    binder?: BinderShape;
    facets?: Facets;
    /** Told the new binder's id, when the opener wants to use it (the card sheet files the card in it). */
    onSaved?: (id: string | undefined) => void;
};
type FormProps = BinderFormProps;

/** The form's frame, shared with what stands in for it, so the dialog has one size and look throughout. */
export const BINDER_FORM_FRAME = "flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl glass-thick p-6 shadow-xl";

/*
 * The form (binder-form.tsx), with its pickers, the kit's inputs and the binder actions, loads the
 * first time a binder dialog opens: the sidebar carries New binder on every page, and few visits
 * press it. The trigger and the dialog are here from the start, so a press opens it at once with
 * its title, and focus goes in and back to the trigger on close as before. React's `lazy`, as
 * MarkOwnedDialog does it (#680), so the stand-in can carry the title. A chunk that fails to load
 * (a deploy since the page loaded, the network gone) says so in the dialog, with a retry.
 */
const importForm = () => import("@/components/app/binder-form").then((m) => ({ default: m.BinderForm }));
const LazyBinderForm = lazy(importForm);

// One dialog for a binder's name and its rule: New binder (by hand or by rule) and, on the
// binder's page, Rename or Edit rule. A binder keeps its kind, so edit mode never shows the
// choice. The form mounts inside the dialog, so it starts clean on every open: the sidebar's
// New binder lives for the whole session and must not remember the last binder made. The set
// and rarity pickers are a select that appends chips: the kit has no multi-select, and a list of
// chips reads what a rule says better than a scrolling box (R-UI-001). A page that has the
// facets hands them in; the sidebar has none and the form asks for them when it opens.
export function BinderDialog({ children, ...form }: FormProps & { children: ReactNode }) {
    return (
        <DialogTrigger>
            {children}
            <ModalOverlay>
                <BinderModalBody {...form} />
            </ModalOverlay>
        </DialogTrigger>
    );
}

/**
 * The same dialog, opened by something that is not a pressable child: a menu item on the
 * binder's page. The overlay is controlled; DialogTrigger is not in the picture.
 */
export function BinderModal({ isOpen, onOpenChange, ...form }: FormProps & { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange}>
            <BinderModalBody {...form} />
        </ModalOverlay>
    );
}

function BinderModalBody(form: FormProps) {
    return (
        <Modal className="max-w-md">
            <Dialog>{({ close }) => <LoadedForm form={form} close={close} />}</Dialog>
        </Modal>
    );
}

/** The dialog's title before the form is in. A binder keeps its kind, so it is known up front. */
const titleOf = ({ mode, binder }: FormProps) => (mode === "create" ? "New binder" : binder?.kind === "rule" ? "Edit rule" : "Edit binder");

function LoadedForm({ form, close }: { form: FormProps; close: () => void }) {
    // A retry needs a fresh `lazy`, since the first one keeps a failed import for good, and a fresh
    // boundary, keyed by the attempt.
    const [attempt, setAttempt] = useState<{ n: number; Form: ComponentType<FormProps & { close: () => void }> }>({ n: 0, Form: LazyBinderForm });
    const { Form } = attempt;
    const title = (
        <AriaHeading slot="title" className="text-lg font-semibold text-primary">
            {titleOf(form)}
        </AriaHeading>
    );
    return (
        <LoadBoundary
            key={attempt.n}
            failed={
                <div className={BINDER_FORM_FRAME}>
                    {title}
                    <p className="text-sm text-tertiary" role="alert">
                        The form did not load.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button color="secondary" onClick={close}>
                            Cancel
                        </Button>
                        <Button onClick={() => setAttempt(({ n }) => ({ n: n + 1, Form: lazy(importForm) }))}>Try again</Button>
                    </div>
                </div>
            }
        >
            <Suspense
                fallback={
                    // The form's frame and about a form's height, named as the form is, so the dialog has its title and its size before the rest arrives.
                    <div className={`${BINDER_FORM_FRAME} min-h-96`} aria-busy="true">
                        {title}
                    </div>
                }
            >
                <Form {...form} close={close} />
            </Suspense>
        </LoadBoundary>
    );
}

/** What a failed chunk draws instead of the form; a render error in the form itself is caught the same way. */
class LoadBoundary extends Component<{ children: ReactNode; failed: ReactNode }, { error: boolean }> {
    state = { error: false };

    static getDerivedStateFromError() {
        return { error: true };
    }

    render() {
        return this.state.error ? this.props.failed : this.props.children;
    }
}
