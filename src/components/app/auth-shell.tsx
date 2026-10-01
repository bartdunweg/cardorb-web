"use client";

import { type ReactNode, createContext, use, useEffect } from "react";
import Link from "next/link";
import { Heading as AriaHeading } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { OrbMark } from "./orb-mark";

/**
 * The frame around every page you are not signed in on: sign in, sign up, forgot and reset.
 *
 * One centred column: the moving orb at the size the landing page shows it on a phone (160 px),
 * the wordmark, a heading and a line of its own, then whatever the page asks for, no marketing
 * panel beside it. The four pages were the same thirteen
 * lines of markup four times, and a change to the frame had to be made four times or the pages
 * drifted apart.
 *
 * In a modal (auth-modal.tsx, over the page a visitor was on) the same forms draw in the frame of
 * Untitled UI PRO's login-modal: the orb at the kit's 32 px logo size, no wordmark since the app is
 * right behind it, a `text-md` title naming the dialog, and fields and buttons at `md` (`useAuthSize`). One set of forms either way, so a change to one reaches both.
 *
 * `footer` is the one line under the column that sends you to the other page ("Don't have an
 * account? Sign up"). Reset has none: you arrive there from a link in an email, and there is no
 * other page to be on.
 */
/** Where the auth forms are drawn: their own page, or a modal over another. */
const AuthFrame = createContext<"page" | "modal">("page");
export const AuthFrameProvider = AuthFrame.Provider;

/** The size of the fields and the button: the page's `lg`, the modal's `md` as the kit's login-modal has them. */
export function useAuthSize(): "md" | "lg" {
    return use(AuthFrame) === "modal" ? "md" : "lg";
}

/** Told while a form is sending, so the modal around it does not close under an answer on its way. */
const AuthBusy = createContext<(busy: boolean) => void>(() => {});
export const AuthBusyProvider = AuthBusy.Provider;

/** A form says it is sending (useActionState's `pending`); a no-op on the full page. */
export function useAuthBusy(pending: boolean) {
    const tell = use(AuthBusy);
    useEffect(() => {
        tell(pending);
        return () => tell(false);
    }, [pending, tell]);
}

export function AuthShell({
    title,
    subtitle,
    footer,
    children,
}: {
    title: string;
    subtitle: string;
    footer?: { question: string; href: string; label: string };
    children: ReactNode;
}) {
    const frame = use(AuthFrame);
    if (frame === "modal") {
        return (
            // Untitled UI PRO's login-modal: the mark at 32 px over a centred title and its line,
            // 20 px of air, then the form and its link, 16 px in on a phone and 24 px from sm.
            <div className="flex w-full flex-col gap-5 px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <OrbMark size={48} />
                    <div className="flex flex-col gap-0.5">
                        <AriaHeading slot="title" className="text-md font-semibold text-primary">
                            {title}
                        </AriaHeading>
                        <p className="text-sm text-tertiary">{subtitle}</p>
                    </div>
                </div>

                {children}

                {footer ? <Footer {...footer} replace /> : null}
            </div>
        );
    }
    return (
        // The window's height and its background are the route layout's, so this is the column alone.
        <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
            <div className="flex w-full flex-col gap-8 sm:max-w-90">
                <div className="flex flex-col items-center gap-6 text-center">
                    <OrbMark size={240} />
                    <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                        Cardorb
                    </Link>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">{title}</h1>
                        <p className="text-md text-tertiary">{subtitle}</p>
                    </div>
                </div>

                {children}

                {footer ? <Footer {...footer} /> : null}
            </div>
        </div>
    );
}

/** `replace`: in the modal the switch to the other form takes this one's place, so closing closes rather than steps back to it. */
function Footer({ question, href, label, replace = false }: { question: string; href: string; label: string; replace?: boolean }) {
    return (
        <div className="flex justify-center gap-1 text-center">
            <span className="text-sm text-tertiary">{question}</span>
            <Button href={href} color="link-color" size="md" routerOptions={replace ? { replace: true } : undefined}>
                {label}
            </Button>
        </div>
    );
}

/**
 * The email field, as sign in, sign up and forgot all three ask for it: the same label, the same
 * placeholder, required. Sign-up holds the value itself: a form resets its uncontrolled fields
 * after its action, so an error from the server emptied the address while the password stayed.
 */
export function AuthEmailField({ value, onChange }: { value?: string; onChange?: (value: string) => void } = {}) {
    const size = useAuthSize();
    return (
        <Input
            isRequired
            hideRequiredIndicator
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Enter your email"
            size={size}
            {...(onChange ? { value, onChange } : {})}
        />
    );
}
