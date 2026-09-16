import type { Metadata } from "next";
import { LoginForm } from "@/components/app/login-form";
import { loginNoticeFor } from "@/lib/auth-redirect";

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
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;
    return <LoginForm notice={loginNoticeFor(typeof error === "string" ? error : undefined)} />;
}
