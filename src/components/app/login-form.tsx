"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, signIn } from "@/app/(auth)/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

// Clean, single-column sign-in: the form centered in the viewport, no marketing panel.
export const LoginForm = () => {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, undefined);

    return (
        <section className="flex min-h-dvh flex-col bg-primary">
            <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
                <div className="flex w-full flex-col gap-8 sm:max-w-90">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                            Cardorb
                        </Link>
                        <div className="flex flex-col gap-2 md:gap-3">
                            <h1 className="text-xl font-semibold text-primary md:text-display-xs">Log in</h1>
                            <p className="text-md text-tertiary">Welcome back. Enter your details.</p>
                        </div>
                    </div>

                    <form action={formAction} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-5">
                            <Input isRequired hideRequiredIndicator label="Email" type="email" name="email" placeholder="Enter your email" size="lg" />
                            <Input
                                isRequired
                                hideRequiredIndicator
                                label="Password"
                                type="password"
                                name="password"
                                size="lg"
                                placeholder="••••••••••••"
                                inputClassName="placeholder:text-placeholder/50"
                            />
                        </div>

                        {state && "error" in state && <p className="text-sm text-error-primary">{state.error}</p>}

                        <Button type="submit" size="lg" isDisabled={pending}>
                            {pending ? "Signing in…" : "Sign in"}
                        </Button>
                    </form>

                    <div className="flex justify-center gap-1 text-center">
                        <span className="text-sm text-tertiary">Don&apos;t have an account?</span>
                        <Button href="/signup" color="link-color" size="md">
                            Sign up
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};
