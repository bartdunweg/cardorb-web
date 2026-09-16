import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/app/reset-password-form";
import { RECOVERY_COOKIE } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "New password",
    robots: { index: false, follow: false },
};

/**
 * Where a recovery link lands (see /auth/confirm). The link signed the person in and left the
 * recovery cookie; this page needs both. A session alone was enough until 2026-09-16, and any
 * session has one: whoever sat at a signed-in browser could set a new password without knowing
 * the old one, which is exactly what Settings refuses. Without either there is nothing to reset,
 * and the sign-in page says why.
 */
export default async function ResetPasswordPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const fromLink = (await cookies()).get(RECOVERY_COOKIE)?.value === "1";
    if (!user || !fromLink) redirect("/login?error=expired");

    return <ResetPasswordForm />;
}
