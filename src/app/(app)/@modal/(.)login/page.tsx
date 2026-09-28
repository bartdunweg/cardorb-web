import { AuthModal } from "@/components/app/auth-modal";
import { LoginForm } from "@/components/app/login-form";
import { loginNoticeFor } from "@/lib/auth-redirect";
import { safeReturn } from "@/lib/return-to";

/** /login opened from inside the app: the same form, over the page (auth-modal.tsx). The page itself is (auth)/login. */
export default async function LoginModal({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
    const { error, next } = await searchParams;
    return (
        <AuthModal>
            <LoginForm notice={loginNoticeFor(typeof error === "string" ? error : undefined)} next={safeReturn(next)} />
        </AuthModal>
    );
}
