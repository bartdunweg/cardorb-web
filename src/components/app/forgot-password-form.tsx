"use client";

import { useActionState } from "react";
import { type AuthState, requestPasswordReset } from "@/app/(auth)/actions";
import { AuthEmailField, AuthShell } from "@/components/app/auth-shell";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/base/buttons/button";

// The same single-column frame as sign-in: one field, one button. After a send the form gives way
// to the confirmation, so a second click cannot send a second email by accident.
export const ForgotPasswordForm = () => {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);
    const sent = state && "success" in state ? state.success : null;

    return (
        <AuthShell
            title="Forgot your password?"
            subtitle={sent ? "Check your inbox." : "Enter your email and we will send a link to set a new one."}
            footer={{ question: "Remembered it?", href: "/login", label: "Sign in" }}
        >
            {sent ? (
                <output className="text-center text-sm text-tertiary">{sent}</output>
            ) : (
                <form action={formAction} className="flex flex-col gap-6">
                    <AuthEmailField />

                    {state && "error" in state && <FormError error={state.error} />}

                    <Button type="submit" size="lg" isDisabled={pending}>
                        {pending ? "Sending…" : "Send reset link"}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
};
