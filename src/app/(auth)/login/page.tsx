"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, signIn } from "@/app/(auth)/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export default function LoginPage() {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, undefined);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">Sign in to Cardorb</h1>
                <p className="text-sm text-tertiary">Manage your trading card collections.</p>
            </div>

            <Input name="email" type="email" label="Email" placeholder="you@example.com" isRequired />
            <Input name="password" type="password" label="Password" placeholder="••••••••" isRequired />

            {state && "error" in state && <p className="text-sm text-error-primary">{state.error}</p>}

            <Button type="submit" size="lg" color="primary" isDisabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-sm text-tertiary">
                No account?{" "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Sign up
                </Link>
            </p>
        </form>
    );
}
