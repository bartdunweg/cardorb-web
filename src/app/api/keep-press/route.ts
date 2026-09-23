import { NextResponse } from "next/server";
import { session } from "@/lib/api";
import { KEPT_PRESS_COOKIE, KEPT_PRESS_MAX_AGE, keepPressRequest, keptPressValue } from "@/lib/kept-press";
import { safeReturn } from "@/lib/return-to";
import { COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

/**
 * Keep a visitor's press, so signing in can carry it through (kept-press.ts says why).
 *
 * A POST from this site's own pages and nothing else, and that is the whole defence. A kept press
 * is applied as the person who next signs in, so the attacker who matters is another site parking
 * one in a visitor's browser: a link on it to "keep Charizard on the wishlist", applied the moment
 * they sign in here. A GET would allow that, since any page can make a browser follow a link. A
 * POST whose Origin is ours cannot be sent from anywhere else, and requiring JSON makes a
 * cross-site attempt a preflighted request the browser refuses before it arrives.
 *
 * Somebody signed in has no press to keep: their press writes at once. They are answered as if it
 * worked and nothing is kept, so a page that raced a sign-in cannot park a write for later.
 */
export async function POST(request: Request) {
    const url = new URL(request.url);
    // Compared as strings, as /api/forget-mine does: `Origin: null` is no URL.
    if (request.headers.get("origin") !== url.origin) return new Response(null, { status: 403 });
    if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return new Response(null, { status: 415 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response(null, { status: 400 });
    }
    const parsed = keepPressRequest.safeParse(body);
    if (!parsed.success) return new Response(null, { status: 400 });
    // The page it was made on is a return address, and read against the same rule.
    const from = safeReturn(parsed.data.from);
    if (!from) return new Response(null, { status: 400 });

    const response = new NextResponse(null, { status: 204 });
    if (await session()) return response;
    // One at a time: setting it replaces whatever was kept before.
    response.cookies.set(KEPT_PRESS_COOKIE, keptPressValue({ ...parsed.data, from }), { ...COOKIE_OPTIONS, path: "/", maxAge: KEPT_PRESS_MAX_AGE });
    return response;
}
