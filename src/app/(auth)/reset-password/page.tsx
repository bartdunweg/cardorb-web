import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/app/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "New password",
    robots: { index: false, follow: false },
};

/**
 * Where a recovery link lands (see /auth/confirm). The link signed the person in, so this page
 * needs a session and nothing else; without one there is nothing to reset, and the sign-in page
 * says why.
 */
export default async function ResetPasswordPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/login?error=${encodeURIComponent("That link has expired. Ask for a new one.")}`);

    return <ResetPasswordForm />;
}
