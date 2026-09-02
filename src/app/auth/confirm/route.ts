import { NextResponse } from "next/server";
import { landingFor, linkParamsSchema } from "@/lib/auth-redirect";
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
    const fail = (why: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(why)}`, url));

    const parsed = linkParamsSchema.safeParse({
        token_hash: url.searchParams.get("token_hash"),
        type: url.searchParams.get("type"),
    });
    if (!parsed.success) return fail("That link is missing something.");

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp(parsed.data);
    if (error) {
        // Not the provider's wording. "Token has expired or is invalid" is accurate and unhelpful;
        // what a person needs to know is that the link is spent and how to get another.
        console.error("Confirming an auth link failed:", error.message);
        return fail("That link has expired. Ask for a new one.");
    }

    return NextResponse.redirect(new URL(landingFor(parsed.data.type), url));
}
