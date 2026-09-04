import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { elapsed, logTiming } from "@/lib/timing";

// Public by default (landing, login, signup). Only these prefixes require a session.
const PROTECTED_PREFIXES = ["/dashboard"];
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
        if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.search = "";
            return NextResponse.redirect(url);
        }
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

    // IMPORTANT: getUser() must run to refresh the token; do not add logic between this and the response.
    const started = performance.now();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const authMs = elapsed(started);
    logTiming("middleware getUser", authMs, request.nextUrl.pathname);
    // Visible in the browser's Network panel under Timing, so the person who feels a slow page
    // can see how much of it was the session check.
    supabaseResponse.headers.set("server-timing", `auth;dur=${authMs}`);

    const { pathname } = request.nextUrl;
    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!user && isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (user && ENTRY_PATHS.includes(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
