"use client";

import { type ReactNode, useState } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";

/*
 * The import's form is opened rarely and brings the CSV reading with it: its code loads apart, on the
 * first open. The trigger and the dialog around it load with the page. They were loaded apart too,
 * and a press on the row in the moment between the page being ready and that code arriving did
 * nothing at all: React held the page but not the row (e2e typography.spec.ts, four CI failures up to
 * 2026-09-19). Now the row is the page's from the start and opens at once; the form fills the dialog
 * when its code is in.
 */
const ImportForm = dynamic(() => import("@/components/app/import-dialog").then((m) => m.ImportForm), {
    // The dialog's room while the form's code loads, so it opens at its size rather than growing.
    loading: () => <div aria-busy="true" className="h-96" />,
});

export function ImportDialog({ children }: { children: ReactNode }) {
    /*
     * True while the write is out. Escape is the overlay's, not the form's, so
     * the form reports it up here: closing mid-write unmounted the only screen
     * that could say what the write did.
     */
    const [writing, setWriting] = useState(false);

    return (
        <DialogTrigger>
            {children}
            {/* No padding around it on a phone: the dialog is the screen there. */}
            <ModalOverlay className="max-sm:p-0" isKeyboardDismissDisabled={writing}>
                <Modal className="max-w-2xl max-sm:h-dvh max-sm:max-w-none max-sm:overflow-hidden max-sm:rounded-none">
                    <Dialog className="h-full">{({ close }) => <ImportForm close={close} onWriting={setWriting} />}</Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
