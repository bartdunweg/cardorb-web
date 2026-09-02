import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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
    // Before Supabase env is configured, let requests through so the app still runs.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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
    const {
        data: { user },
    } = await supabase.auth.getUser();

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
