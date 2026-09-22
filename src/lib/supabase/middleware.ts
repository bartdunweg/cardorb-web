import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeReturn } from "@/lib/return-to";
import { COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { elapsed, logTiming } from "@/lib/timing";

/**
 * The pages that still send a visitor away, and there are only three left.
 *
 * Everything in the navigation opens instead and says what an account adds there (the app
 * without an account, 2026-09-23). Pressing Home and being handed a login form is an answer to a
 * question nobody asked: they asked for Home. A page that opens can show the shape of what it
 * holds, which is also the only way somebody sees what they would be making an account for.
 *
 * These three are not in a visitor's navigation and have nothing to show. Settings and the
 * profile are reached from the account menu, which for a visitor is the way in; the design page
 * is a tool for building the app and not a page of it.
 *
 * A page that opens must check the session itself. `signed-out-pages.test.tsx` walks every route
 * under (app) and demands that each one either stands here or renders an invitation, so a new
 * page cannot join the open set by being forgotten.
 */
const PROTECTED_PREFIXES = ["/dashboard/settings", "/dashboard/you", "/dashboard/design"];

/** Whether this address still sends a visitor to the door. Exported so it can be asserted rather than inferred. */
export const isProtected = (pathname: string) => PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
// A signed-in person has no use for these; they go to the dashboard. Deciding it here keeps the
// landing page free of any session lookup, so it prerenders.
const ENTRY_PATHS = ["/", "/login", "/signup"];

/**
 * Refresh the Supabase session on every request and gate access. The site is public by default;
 * only routes under PROTECTED_PREFIXES redirect unauthenticated users to /login.
 */
export async function updateSession(request: NextRequest) {
    // Without Supabase env there is no session to check. The public pages still serve; the
    // protected part closes rather than opens, so a misconfigured deploy cannot show a dashboard.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { pathname } = request.nextUrl;
        if (isProtected(pathname)) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.search = "";
            return NextResponse.redirect(url);
        }
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookieOptions: COOKIE_OPTIONS,
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                supabaseResponse = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
            },
        },
    });

    // getClaims() rather than getUser(): getUser() asked the auth server on every page, 70 to
    // 360 ms in front of each navigation, and on a warm cache that was the whole of a page's
    // server time. getClaims() reads the session (refreshing it when expired, as getUser did)
    // and verifies the token's signature locally against the project's published keys (the
    // project signs with ES256, the key set is cached per process) and only falls back to the
    // auth server for a token it cannot verify itself. The log line names the algorithm so a
    // deploy shows which path it took. Do not add logic between this and the response.
    const started = performance.now();
    const { data: claims } = await supabase.auth.getClaims();
    const user = claims?.claims.sub ? { id: claims.claims.sub } : null;
    const authMs = elapsed(started);
    logTiming("middleware getClaims", authMs, `${claims?.header.alg ?? "none"} ${request.nextUrl.pathname}`);
    // Visible in the browser's Network panel under Timing, so the person who feels a slow page
    // can see how much of it was the session check.
    supabaseResponse.headers.set("server-timing", `auth;dur=${authMs}`);

    const { pathname } = request.nextUrl;
    const protectedHere = isProtected(pathname);

    if (!user && protectedHere) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        // Where they were going, so signing in finishes the journey rather than landing them on
        // Home. The same rule the invitations use, and the form checks it again on the far side.
        const back = safeReturn(`${pathname}${request.nextUrl.search}`);
        url.search = back ? `?next=${encodeURIComponent(back)}` : "";
        return NextResponse.redirect(url);
    }

    if (user && ENTRY_PATHS.includes(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        // With the cookies getClaims() may just have rotated: a bare redirect dropped them, the
        // browser replayed the old refresh token on the next request, and past the reuse
        // interval that signed the person out on the way in.
        const redirected = NextResponse.redirect(url);
        for (const cookie of supabaseResponse.cookies.getAll()) redirected.cookies.set(cookie);
        return redirected;
    }

    return supabaseResponse;
}
