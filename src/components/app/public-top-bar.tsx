import Link from "next/link";
import { Button } from "@/components/base/buttons/button";

// The top bar every public page shares: the landing, the legal pages, the API reference and a
// public profile. The wordmark on the left, Sign in and Get started on the right, so the bar
// looks the same wherever a visitor lands. The auth pages do not use it: on /login and /signup
// the buttons would point at the page you are on.
export function PublicTopBar() {
    return (
        <header className="relative z-10 mx-auto flex w-full max-w-container items-center justify-between px-4 py-5 md:px-8">
            <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                Cardorb
            </Link>
            <nav aria-label="Account" className="flex items-center gap-2">
                <Button href="/login" color="tertiary" size="md">
                    Sign in
                </Button>
                <Button href="/signup" size="md">
                    Get started
                </Button>
            </nav>
        </header>
    );
}
