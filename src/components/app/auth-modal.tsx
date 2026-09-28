"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthFrameProvider } from "@/components/app/auth-shell";
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
 * Closing is going back, which is where the visitor came from.
 */
export function AuthModal({ children }: { children: ReactNode }) {
    const router = useRouter();
    return (
        <ModalOverlay isOpen isDismissable onOpenChange={(open) => (open ? null : router.back())}>
            <Modal className="sm:max-w-100">
                <Dialog>
                    {({ close }) => (
                        <div className="relative flex w-full flex-col rounded-2xl glass-thick p-6 shadow-xl sm:p-8">
                            <CloseButton onPress={close} size="sm" label="Close" className="absolute top-3 right-3" />
                            <AuthFrameProvider value="modal">{children}</AuthFrameProvider>
                        </div>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
