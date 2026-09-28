"use client";

import { type ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthBusyProvider, AuthFrameProvider } from "@/components/app/auth-shell";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { CloseButton } from "@/components/base/buttons/close-button";

/**
 * Sign in and sign up over the page a visitor was on, rather than instead of it (Bart, 2026-09-28).
 *
 * The pattern shipped apps use (Vimeo, Coursera, Contra on Mobbin): the page stays behind, dimmed,
 * and the form sits on it with a way to close and a line that switches between the two. A visitor
 * who pressed "Add to collection" on a card keeps the card in view, and closing puts them back on it.
 *
 * It is the same /login and /signup, intercepted by the app frame (`@modal/(.)login`): a link from
 * inside the app opens them here, and a link from anywhere else (an email, a bookmark, a reload)
 * opens the page as before. So every existing link, `?next=` and the kept press work unchanged.
 * Closing is going back, which is where the visitor came from. Not while a form is sending: the
 * answer (an email on its way, or the page signing in leads to) would arrive to a form that is gone.
 *
 * Drawn only on /login and /signup. A slot keeps what it last showed through a navigation it has no
 * page for, so after signing in sends you on, the modal would otherwise stay open over that page. A
 * catch-all page in the slot did the same job but made every unknown address a route of the app.
 */
export function AuthModal({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [busy, setBusy] = useState(false);
    if (pathname !== "/login" && pathname !== "/signup") return null;
    return (
        <ModalOverlay isOpen isDismissable={!busy} isKeyboardDismissDisabled={busy} onOpenChange={(open) => (open ? null : router.back())}>
            <Modal className="sm:max-w-100">
                <Dialog>
                    {({ close }) => (
                        <div className="relative flex w-full flex-col rounded-2xl glass-thick p-6 shadow-xl sm:p-8">
                            <CloseButton onPress={close} isDisabled={busy} size="sm" label="Close" className="absolute top-3 right-3" />
                            <AuthBusyProvider value={setBusy}>
                                <AuthFrameProvider value="modal">{children}</AuthFrameProvider>
                            </AuthBusyProvider>
                        </div>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
