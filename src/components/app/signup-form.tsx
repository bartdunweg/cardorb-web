"use client";

import { useActionState, useState } from "react";
import { CheckCircle } from "@untitledui/icons";
import { type AuthState, signUp } from "@/app/(auth)/actions";
import { AuthEmailField, AuthShell } from "@/components/app/auth-shell";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/base/buttons/button";
import { HintText } from "@/components/base/input/hint-text";
import { InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { cx } from "@/utils/cx";

// Clean, single-column sign-up: the form centered in the viewport, no marketing panel.
export const SignupForm = () => {
    const [password, setPassword] = useState("");
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, undefined);

    return (
        <AuthShell
            title="Sign up"
            subtitle="Create your account to start managing your collection."
            footer={{ question: "Already have an account?", href: "/login", label: "Sign in" }}
        >
            <form action={formAction} className="flex flex-col gap-6">
                <div className="flex flex-col gap-5">
                    <AuthEmailField />
                    <TextField isRequired size="lg" name="password" value={password} onChange={setPassword} minLength={8}>
                        <Label isRequired={false}>Password</Label>
                        <InputBase type="password" autoComplete="new-password" placeholder="••••••••••••" inputClassName="placeholder:text-placeholder/50" />
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

                {state && "error" in state && <FormError error={state.error} />}
                {state && "success" in state && <output className="text-sm text-success-primary">{state.success}</output>}

                <Button type="submit" size="lg" isDisabled={pending}>
                    {pending ? "Creating account…" : "Get started"}
                </Button>
            </form>
        </AuthShell>
    );
};
