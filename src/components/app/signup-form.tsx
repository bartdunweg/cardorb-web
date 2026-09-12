"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle, Circle, Mail01 } from "@untitledui/icons";
import { type AuthState, signUp } from "@/app/(auth)/actions";
import { AuthEmailField, AuthShell } from "@/components/app/auth-shell";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/base/buttons/button";
import { HintText } from "@/components/base/input/hint-text";
import { InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

// The floor Supabase enforces; the schema in src/lib/validation/auth.ts says why it is this number.
const MIN_PASSWORD = 10;

// Clean, single-column sign-up: the form centered in the viewport, no marketing panel.
export const SignupForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, undefined);
    const long = password.length >= MIN_PASSWORD;
    const done = useRef<HTMLOutputElement>(null);
    const sent = state !== undefined && "success" in state;

    // The form the focus was in is gone once the email is sent; without this the focus falls
    // to the body and a screen reader says nothing about what replaced it.
    useEffect(() => {
        if (sent) done.current?.focus();
    }, [sent]);

    // Once the email is on its way the form has nothing left to ask, so it goes: the message
    // under a form that still said "Get started" read as one more step to take.
    if (state && "success" in state) {
        return (
            <AuthShell
                title="Check your email"
                subtitle={state.success}
                // The one place to go from here: whoever confirmed in another tab lands back on this
                // one, and without the line it had no way out but the wordmark.
                footer={{ question: "Already confirmed?", href: "/login", label: "Sign in" }}
            >
                <output
                    ref={done}
                    tabIndex={-1}
                    aria-label={`Check your email. ${state.success}`}
                    className="flex flex-col items-center gap-6 text-center outline-none"
                >
                    <FeaturedIcon icon={Mail01} color="gray" theme="modern" size="lg" />
                    <p className="text-sm text-tertiary">
                        The link works for an hour. Nothing there? Look in spam, or sign up again with the same address and a new one is sent.
                    </p>
                </output>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Sign up"
            subtitle="Create your account to start managing your collection."
            footer={{ question: "Already have an account?", href: "/login", label: "Sign in" }}
        >
            <form action={formAction} className="flex flex-col gap-6">
                <div className="flex flex-col gap-5">
                    <AuthEmailField value={email} onChange={setEmail} />
                    <TextField isRequired size="lg" name="password" value={password} onChange={setPassword} minLength={MIN_PASSWORD}>
                        <Label isRequired={false}>Password</Label>
                        <InputBase type="password" autoComplete="new-password" placeholder="••••••••••••" inputClassName="placeholder:text-placeholder/50" />
                        <HintText className="flex items-center gap-1">
                            {/* The glyph itself changes, not only its colour: an empty circle while the rule is
                                unmet, a tick once it is. Green alone said it to whoever could see green. */}
                            {long ? (
                                <CheckCircle className="size-4 text-fg-success-primary" />
                            ) : (
                                <Circle className="size-4 text-fg-quaternary group-invalid:text-fg-error-secondary" />
                            )}
                            Must be at least {MIN_PASSWORD} characters.
                            <span className="sr-only">{long ? ": met" : ": not met"}</span>
                        </HintText>
                    </TextField>
                </div>

                {state && "error" in state && <FormError error={state.error} />}

                <Button type="submit" size="lg" isDisabled={pending}>
                    {pending ? "Creating account…" : "Get started"}
                </Button>
            </form>
        </AuthShell>
    );
};
