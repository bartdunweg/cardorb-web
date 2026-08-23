"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export default function SignupPage() {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, undefined);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">Create your account</h1>
                <p className="text-sm text-tertiary">Start managing your trading card collections.</p>
            </div>

            <Input name="email" type="email" label="Email" placeholder="you@example.com" isRequired />
            <Input name="password" type="password" label="Password" hint="At least 8 characters." placeholder="••••••••" isRequired />

            {state && "error" in state && <p className="text-sm text-error-primary">{state.error}</p>}
            {state && "success" in state && <p className="text-sm text-success-primary">{state.success}</p>}

            <Button type="submit" size="lg" color="primary" isDisabled={pending}>
                {pending ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-sm text-tertiary">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </form>
    );
}
