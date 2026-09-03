"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, requestPasswordReset } from "@/app/(auth)/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

// The same single-column frame as sign-in: one field, one button. After a send the form gives way
// to the confirmation, so a second click cannot send a second email by accident.
export const ForgotPasswordForm = () => {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);
    const sent = state && "success" in state ? state.success : null;

    return (
        <main className="flex min-h-dvh flex-col bg-primary">
            <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
                <div className="flex w-full flex-col gap-8 sm:max-w-90">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                            Cardorb
                        </Link>
                        <div className="flex flex-col gap-2 md:gap-3">
                            <h1 className="text-xl font-semibold text-primary md:text-display-xs">Forgot your password?</h1>
                            <p className="text-md text-tertiary">{sent ? "Check your inbox." : "Enter your email and we will send a link to set a new one."}</p>
                        </div>
                    </div>

                    {sent ? (
                        <output className="text-center text-sm text-tertiary">{sent}</output>
                    ) : (
                        <form action={formAction} className="flex flex-col gap-6">
                            <Input
                                isRequired
                                hideRequiredIndicator
                                label="Email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                placeholder="Enter your email"
                                size="lg"
                            />

                            {state && "error" in state && (
                                <p role="alert" className="text-sm text-error-primary">
                                    {state.error}
                                </p>
                            )}

                            <Button type="submit" size="lg" isDisabled={pending}>
                                {pending ? "Sending…" : "Send reset link"}
                            </Button>
                        </form>
                    )}

                    <div className="flex justify-center gap-1 text-center">
                        <span className="text-sm text-tertiary">Remembered it?</span>
                        <Button href="/login" color="link-color" size="md">
                            Log in
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
};
