import type { Metadata } from "next";
import { SignupForm } from "@/components/app/signup-form";

export const metadata: Metadata = {
    alternates: { canonical: "/signup" },
    title: "Sign up",
    description: "Create a free Cardorb account and start keeping track of your Pokémon card collection.",
};

export default function SignupPage() {
    return <SignupForm />;
}
