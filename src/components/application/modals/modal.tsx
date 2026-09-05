"use client";

import type { DialogProps as AriaDialogProps, ModalOverlayProps as AriaModalOverlayProps } from "react-aria-components";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from "react-aria-components";
import { cx } from "@/utils/cx";

export const DialogTrigger = AriaDialogTrigger;

export const ModalOverlay = (props: AriaModalOverlayProps) => {
    return (
        <AriaModalOverlay
            {...props}
            className={(state) =>
                cx(
                    // A centred dialog at every size: a sheet is for browsing (a card, the search), a dialog for a decision.
                    "fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-overlay/70 p-4 outline-hidden backdrop-blur-[6px] sm:p-8",
                    // The enter curve both ways: an exit that eases in starts slow, on the very frame
                    // the person is waiting for it to be gone.
                    state.isEntering && "duration-300 animate-in [animation-timing-function:var(--ease-enter)] fade-in",
                    state.isExiting && "duration-200 animate-out [animation-timing-function:var(--ease-enter)] fade-out",
                    typeof props.className === "function" ? props.className(state) : props.className,
                )
            }
        />
    );
};

export const Modal = (props: AriaModalOverlayProps) => (
    <AriaModal
        {...props}
        className={(state) =>
            cx(
                "max-h-full w-full align-middle outline-hidden max-sm:overflow-y-auto max-sm:rounded-xl",
                // Reduced motion keeps the fade and drops the zoom.
                state.isEntering && "duration-300 animate-in [animation-timing-function:var(--ease-enter)] fade-in zoom-in-95 motion-reduce:zoom-in-100",
                state.isExiting && "duration-200 animate-out [animation-timing-function:var(--ease-enter)] fade-out zoom-out-95 motion-reduce:zoom-out-100",
                typeof props.className === "function" ? props.className(state) : props.className,
            )
        }
    />
);

export const Dialog = (props: AriaDialogProps) => (
    <AriaDialog {...props} className={cx("flex w-full items-center justify-center outline-hidden", props.className)} />
);
