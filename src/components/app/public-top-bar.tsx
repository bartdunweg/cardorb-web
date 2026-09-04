import Link from "next/link";
import { AccountMenu } from "@/components/app/account-menu";
import { Button } from "@/components/base/buttons/button";
import type { Account } from "@/lib/profile";

// The top bar every public page shares: the landing, the legal pages, the API reference and a
// public profile. The wordmark on the left, Sign in and Get started on the right, so the bar
// looks the same wherever a visitor lands. The auth pages do not use it: on /login and /signup
// the buttons would point at the page you are on.
//
// A page a signed-in person can reach (a public profile) hands in their account, and the pair
// gives way to the account menu they know from the app: Sign in would be nonsense to them.
export function PublicTopBar({ account }: { account?: Account | null }) {
    return (
        <header className="relative z-10 mx-auto flex w-full max-w-container items-center justify-between px-4 py-5 md:px-8">
            <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                Cardorb
            </Link>
            {account ? (
                <AccountMenu account={account} compact />
            ) : (
                <nav aria-label="Account" className="flex items-center gap-2">
                    <Button href="/login" color="tertiary" size="md">
                        Sign in
                    </Button>
                    <Button href="/signup" size="md">
                        Get started
                    </Button>
                </nav>
            )}
        </header>
    );
}
