import type { Metadata } from "next";
import { LoginForm } from "@/components/app/login-form";

export const metadata: Metadata = {
    alternates: { canonical: "/login" },
    title: "Log in",
    description: "Log in to Cardorb to see your Pokémon card collection, your wishlist and your Pokédex.",
};

/**
 * `?error=` is set by /auth/confirm when an email link cannot be verified. It is shown as a
 * notice above the form, not as the form's own error: nothing here was submitted yet.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;
    return <LoginForm notice={typeof error === "string" && error.length > 0 ? error : undefined} />;
}
