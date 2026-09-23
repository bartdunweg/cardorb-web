import type { Metadata } from "next";
import { LoginForm } from "@/components/app/login-form";
import { loginNoticeFor } from "@/lib/auth-redirect";
import { safeReturn } from "@/lib/return-to";

export const metadata: Metadata = {
    alternates: { canonical: "/login" },
    title: "Sign in",
    description: "Sign in to Cardorb to see your Pokémon card collection, your wishlist and your Pokédex.",
};

/**
 * `?error=` is a code set by /auth/confirm when an email link cannot be verified, read against
 * the table in auth-redirect.ts; a sentence in the address is not shown. It is a notice above
 * the form, not the form's own error: nothing here was submitted yet.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
    const { error, next } = await searchParams;
    // Where an invitation said this visitor was. Checked here and again in the action: this value
    // travelled through the browser, so it is a stranger's until it is read against the rule.
    return <LoginForm notice={loginNoticeFor(typeof error === "string" ? error : undefined)} next={safeReturn(next)} />;
}
