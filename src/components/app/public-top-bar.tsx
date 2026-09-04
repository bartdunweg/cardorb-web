import type { ReactNode } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/app/link-button";

// The top bar every public page shares: the landing, the legal pages, the API reference and a
// public profile. The wordmark on the left, Sign in and Get started on the right, so the bar
// looks the same wherever a visitor lands. The auth pages do not use it: on /login and /signup
// the buttons would point at the page you are on.
//
// A page a signed-in person can reach (a public profile) hands in the account menu they know from
// the app, and the pair gives way to it: Sign in would be nonsense to them. The menu comes in as an
// element rather than being imported here, so the static pages, which never show it, do not
// carry its react-aria dropdown in their script.
export function PublicTopBar({ menu }: { menu?: ReactNode }) {
    return (
        <header className="relative z-10 mx-auto flex w-full max-w-container items-center justify-between px-4 py-5 md:px-8">
            <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                Cardorb
            </Link>
            {menu ?? (
                <nav aria-label="Account" className="flex items-center gap-2">
                    <LinkButton href="/login" color="tertiary" size="md">
                        Sign in
                    </LinkButton>
                    <LinkButton href="/signup" size="md">
                        Get started
                    </LinkButton>
                </nav>
            )}
        </header>
    );
}
