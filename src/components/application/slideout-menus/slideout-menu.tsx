"use client";

import { type ComponentPropsWithRef, type ReactNode, type RefAttributes } from "react";
import type {
    DialogProps as AriaDialogProps,
    ModalOverlayProps as AriaModalOverlayProps,
    ModalRenderProps as AriaModalRenderProps,
} from "react-aria-components";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from "react-aria-components";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx } from "@/utils/cx";

interface ModalOverlayProps extends AriaModalOverlayProps, RefAttributes<HTMLDivElement> {}

export const ModalOverlay = (props: ModalOverlayProps) => {
    return (
        <AriaModalOverlay
            {...props}
            className={(state) =>
                cx(
                    // A bottom sheet on a phone, a drawer from the right from sm up.
                    "fixed inset-0 z-50 flex min-h-dvh w-full items-end justify-center bg-overlay/70 outline-hidden ease-linear sm:items-center sm:justify-end sm:pl-6 md:pl-10",
                    state.isEntering && "duration-300 animate-in fade-in",
                    state.isExiting && "duration-500 animate-out fade-out",
                    typeof props.className === "function" ? props.className(state) : props.className,
                )
            }
        />
    );
};
ModalOverlay.displayName = "ModalOverlay";

interface ModalProps extends AriaModalOverlayProps, RefAttributes<HTMLDivElement> {}

export const Modal = (props: ModalProps) => (
    <AriaModal
        {...props}
        className={(state) =>
            cx(
                "w-full shadow-xl transition sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-100",
                // The sheet enters and leaves through the bottom edge, the drawer through the right one.
                state.isEntering && "duration-300 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:slide-in-from-right",
                state.isExiting && "duration-500 animate-out slide-out-to-bottom sm:slide-out-to-bottom-0 sm:slide-out-to-right",
                typeof props.className === "function" ? props.className(state) : props.className,
            )
        }
    />
);
Modal.displayName = "Modal";

interface DialogProps extends AriaDialogProps, RefAttributes<HTMLElement> {}

export const Dialog = (props: DialogProps) => (
    <AriaDialog
        role="dialog"
        aria-label="Slideout menu"
        {...props}
        className={cx(
            "relative flex size-full max-h-[85dvh] flex-col items-start gap-6 overflow-y-auto rounded-t-2xl bg-primary pb-[env(safe-area-inset-bottom)] ring-1 ring-secondary_alt outline-hidden sm:max-h-full sm:rounded-none sm:pb-0",
            props.className,
        )}
    />
);
Dialog.displayName = "Dialog";

interface SlideoutMenuProps extends Omit<AriaModalOverlayProps, "children">, RefAttributes<HTMLDivElement> {
    children: ReactNode | ((children: AriaModalRenderProps & { close: () => void }) => ReactNode);
    dialogClassName?: string;
}

const Menu = ({ children, dialogClassName, ...props }: SlideoutMenuProps) => {
    return (
        <ModalOverlay {...props}>
            <Modal className={(state) => cx(typeof props.className === "function" ? props.className(state) : props.className)}>
                {(state) => (
                    <Dialog className={dialogClassName}>
                        {({ close }) => {
                            return typeof children === "function" ? children({ ...state, close }) : children;
                        }}
                    </Dialog>
                )}
            </Modal>
        </ModalOverlay>
    );
};
Menu.displayName = "SlideoutMenu";

const Content = ({ role = "main", ...props }: ComponentPropsWithRef<"div">) => {
    return <div role={role} {...props} className={cx("flex size-full flex-col gap-6 overflow-y-auto overscroll-auto px-4 md:px-6", props.className)} />;
};
Content.displayName = "SlideoutContent";

interface SlideoutHeaderProps extends ComponentPropsWithRef<"header"> {
    onClose?: () => void;
}

const Header = ({ className, children, onClose, ...props }: SlideoutHeaderProps) => {
    return (
        <header {...props} className={cx("relative z-1 w-full px-4 pt-6 md:px-6", className)}>
            {children}
            <CloseButton size="sm" className="absolute top-3 right-3 shrink-0" onClick={onClose} />
        </header>
    );
};
Header.displayName = "SlideoutHeader";

const Footer = (props: ComponentPropsWithRef<"footer">) => {
    return <footer {...props} className={cx("w-full p-4 shadow-[inset_0px_1px_0px_0px] shadow-border-secondary md:px-6", props.className)} />;
};
Footer.displayName = "SlideoutFooter";

const SlideoutMenu = Menu as typeof Menu & {
    Trigger: typeof AriaDialogTrigger;
    Content: typeof Content;
    Header: typeof Header;
    Footer: typeof Footer;
};
SlideoutMenu.displayName = "SlideoutMenu";

SlideoutMenu.Trigger = AriaDialogTrigger;
SlideoutMenu.Content = Content;
SlideoutMenu.Header = Header;
SlideoutMenu.Footer = Footer;

export { SlideoutMenu };
