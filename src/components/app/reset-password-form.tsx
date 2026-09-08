"use client";

import { useActionState } from "react";
import { type AuthState, setNewPassword } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/app/auth-shell";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

// The same single-column frame as the sign-in form: one field, one button, nothing to explain.
export const ResetPasswordForm = () => {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(setNewPassword, undefined);

    return (
        <AuthShell title="Choose a new password" subtitle="You are signed in through the link in your email. Set a password to use from now on.">
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

                {state && "error" in state && <FormError error={state.error} />}

                <Button type="submit" size="lg" isDisabled={pending}>
                    {pending ? "Saving…" : "Save password"}
                </Button>
            </form>
        </AuthShell>
    );
};
