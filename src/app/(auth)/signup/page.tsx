import type { Metadata } from "next";
import { SignupForm } from "@/components/app/signup-form";
import { safeReturn } from "@/lib/return-to";

export const metadata: Metadata = {
    alternates: { canonical: "/signup" },
    title: "Sign up",
    description: "Create a free Cardorb account and start keeping track of your Pokémon card collection.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    // Where an invitation said this visitor was. Checked here and again in the action.
    const { next } = await searchParams;
    return <SignupForm next={safeReturn(next)} />;
}
