"use client";

import { useActionState, useState } from "react";
import { CheckCircle } from "@untitledui/icons";
import Link from "next/link";
import { type AuthState, signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/base/buttons/button";
import { HintText } from "@/components/base/input/hint-text";
import { Input, InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { cx } from "@/utils/cx";

// Clean, single-column sign-up: the form centered in the viewport, no marketing panel.
export const SignupForm = () => {
    const [password, setPassword] = useState("");
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, undefined);

    return (
        <main className="flex min-h-dvh flex-col bg-primary">
            <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
                <div className="flex w-full flex-col gap-8 sm:max-w-90">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                            Cardorb
                        </Link>
                        <div className="flex flex-col gap-2 md:gap-3">
                            <h1 className="text-xl font-semibold text-primary md:text-display-xs">Sign up</h1>
                            <p className="text-md text-tertiary">Create your account to start managing your collection.</p>
                        </div>
                    </div>

                    <form action={formAction} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-5">
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
                            <TextField isRequired size="lg" name="password" value={password} onChange={setPassword} minLength={8}>
                                <Label isRequired={false}>Password</Label>
                                <InputBase
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="••••••••••••"
                                    inputClassName="placeholder:text-placeholder/50"
                                />
                                <HintText className="flex items-center gap-1">
                                    <CheckCircle
                                        className={cx(
                                            "size-4 text-fg-quaternary group-invalid:text-fg-error-secondary",
                                            password.length >= 8 && "text-fg-success-primary",
                                        )}
                                    />
                                    Must be at least 8 characters.
                                </HintText>
                            </TextField>
                        </div>

                        {state && "error" in state && (
                            <p role="alert" className="text-sm text-error-primary">
                                {state.error}
                            </p>
                        )}
                        {state && "success" in state && <output className="text-sm text-success-primary">{state.success}</output>}

                        <Button type="submit" size="lg" isDisabled={pending}>
                            {pending ? "Creating account…" : "Get started"}
                        </Button>
                    </form>

                    <div className="flex justify-center gap-1 text-center">
                        <span className="text-sm text-tertiary">Already have an account?</span>
                        <Button href="/login" color="link-color" size="md">
                            Sign in
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
};
