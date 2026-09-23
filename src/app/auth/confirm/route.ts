import { NextResponse } from "next/server";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE, landingFor, linkParamsSchema } from "@/lib/auth-redirect";
import { applyKeptPress } from "@/lib/kept-press-apply";
import { COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { createClient } from "@/lib/supabase/server";

/**
 * Where every auth email link lands: `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…`.
 *
 * The Supabase templates link here rather than to Supabase's own verify endpoint because only a
 * route handler can exchange the token for a session *and* write the session cookies; a redirect
 * cannot. One Supabase project serves the website, the iOS app and the API, so this one route
 * handles a link whichever of them asked for the email.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    // A code, not the sentence: the sign-in page holds the words (auth-redirect.ts).
    const fail = (code: "missing" | "expired") => NextResponse.redirect(new URL(`/login?error=${code}`, url));

    const parsed = linkParamsSchema.safeParse({
        token_hash: url.searchParams.get("token_hash"),
        type: url.searchParams.get("type"),
    });
    if (!parsed.success) return fail("missing");

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp(parsed.data);
    if (error) {
        // Not the provider's wording. "Token has expired or is invalid" is accurate and unhelpful;
        // what a person needs to know is that the link is spent and how to get another.
        console.error("Confirming an auth link failed:", error.message);
        return fail("expired");
    }

    // A confirmed sign-up is somebody becoming somebody, so a press they kept as a visitor is
    // carried through here. Only in the browser that kept it: a mail opened elsewhere has no
    // cookie, and nothing happens, which is the right answer and needs no apology. No caches to
    // drop (forget: false): an account made a moment ago has nothing cached, and updateTag is a
    // server action's alone.
    if (parsed.data.type === "signup" && data.session) {
        try {
            await applyKeptPress({ token: data.session.access_token, userId: data.session.user.id, forget: false });
        } catch (err) {
            console.error("A kept press could not be carried through:", err instanceof Error ? err.message : err);
        }
    }

    const response = NextResponse.redirect(new URL(landingFor(parsed.data.type), url));
    // A recovery link is the one proof /reset-password accepts (auth-redirect.ts).
    if (parsed.data.type === "recovery") response.cookies.set(RECOVERY_COOKIE, "1", { ...COOKIE_OPTIONS, path: "/", maxAge: RECOVERY_COOKIE_MAX_AGE });
    return response;
}
