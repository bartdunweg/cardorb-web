"use client";

import { startTransition, useActionState } from "react";
import { type AuthState, signIn } from "@/app/(auth)/actions";
import { AuthEmailField, AuthShell } from "@/components/app/auth-shell";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

// Clean, single-column sign-in: the form centered in the viewport, no marketing panel.
export const LoginForm = ({ notice, next }: { notice?: string; next?: string | null }) => {
    const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, undefined);

    return (
        <AuthShell
            title="Sign in"
            subtitle="Welcome back. Enter your details."
            footer={{ question: "Don’t have an account?", href: "/signup", label: "Sign up" }}
        >
            {/* A link that could not be verified is a failure, in the colour and role every other
                failure on these forms has; as grey body text it read as a caption. */}
            <FormError error={notice} />

            {/* Taken by hand once the page runs, as the sign-up form does: React resets a form after its
                action, so an error from the server emptied what was typed. `action` stays for the moment
                before hydration, or the browser would send the form as a GET. */}
            <form
                action={formAction}
                className="flex flex-col gap-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    startTransition(() => formAction(data));
                }}
            >
                <div className="flex flex-col gap-5">
                    <AuthEmailField />
                    <Input
                        isRequired
                        hideRequiredIndicator
                        label="Password"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        size="lg"
                        placeholder="••••••••••••"
                        inputClassName="placeholder:text-placeholder/50"
                    />
                    <div className="flex justify-end">
                        <Button href="/forgot-password" color="link-color" size="md">
                            Forgot password?
                        </Button>
                    </div>
                </div>

                {state && "error" in state && <FormError error={state.error} />}

                <Button type="submit" size="lg" isLoading={pending} showTextWhileLoading>
                    {pending ? "Signing in…" : "Sign in"}
                </Button>
                {/* Where the invitation said this visitor was. An action reads the form and not
                    the address, and the value is checked again on the far side. */}
                {next ? <input type="hidden" name="next" value={next} /> : null}
            </form>
        </AuthShell>
    );
};
