"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, setNewPassword } from "@/app/(auth)/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

// The same single-column frame as the sign-in form: one field, one button, nothing to explain.
export const ResetPasswordForm = () => {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(setNewPassword, undefined);

    return (
        <section className="flex min-h-dvh flex-col bg-primary">
            <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
                <div className="flex w-full flex-col gap-8 sm:max-w-90">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                            Cardorb
                        </Link>
                        <div className="flex flex-col gap-2 md:gap-3">
                            <h1 className="text-xl font-semibold text-primary md:text-display-xs">Choose a new password</h1>
                            <p className="text-md text-tertiary">You are signed in through the link in your email. Set a password to use from now on.</p>
                        </div>
                    </div>

                    <form action={formAction} className="flex flex-col gap-6">
                        <Input
                            isRequired
                            hideRequiredIndicator
                            label="New password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            size="lg"
                            placeholder="••••••••••••"
                            inputClassName="placeholder:text-placeholder/50"
                        />

                        {state && "error" in state && (
                            <p role="alert" className="text-sm text-error-primary">
                                {state.error}
                            </p>
                        )}

                        <Button type="submit" size="lg" isDisabled={pending}>
                            {pending ? "Saving…" : "Save password"}
                        </Button>
                    </form>
                </div>
            </div>
        </section>
    );
};
