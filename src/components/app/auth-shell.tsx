import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

/**
 * The frame around every page you are not signed in on: sign in, sign up, forgot and reset.
 *
 * One centred column, the wordmark above a heading and a line of its own, then whatever the page
 * asks for — no marketing panel beside it. The four pages were the same thirteen lines of markup
 * four times, and a change to the frame had to be made four times or the pages drifted apart.
 *
 * `footer` is the one line under the column that sends you to the other page ("Don't have an
 * account? Sign up"). Reset has none: you arrive there from a link in an email, and there is no
 * other page to be on.
 */
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
    return (
        // The window's height and its background are the route layout's, so this is the column alone.
        <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
            <div className="flex w-full flex-col gap-8 sm:max-w-90">
                <div className="flex flex-col items-center gap-6 text-center">
                    <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                        Cardorb
                    </Link>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">{title}</h1>
                        <p className="text-md text-tertiary">{subtitle}</p>
                    </div>
                </div>

                {children}

                {footer ? (
                    <div className="flex justify-center gap-1 text-center">
                        <span className="text-sm text-tertiary">{footer.question}</span>
                        <Button href={footer.href} color="link-color" size="md">
                            {footer.label}
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/** The email field, as sign in, sign up and forgot all three ask for it: the same label, the same placeholder, required. */
export function AuthEmailField() {
    return <Input isRequired hideRequiredIndicator label="Email" type="email" name="email" autoComplete="email" placeholder="Enter your email" size="lg" />;
}
