import { AuthModal } from "@/components/app/auth-modal";
import { SignupForm } from "@/components/app/signup-form";
import { safeReturn } from "@/lib/return-to";

/** /signup opened from inside the app: the same form, over the page (auth-modal.tsx). The page itself is (auth)/signup. */
export default async function SignupModal({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    const { next } = await searchParams;
    return (
        <AuthModal>
            <SignupForm next={safeReturn(next)} />
        </AuthModal>
    );
}
