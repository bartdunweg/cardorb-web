import { type NextRequest, NextResponse } from "next/server";
import { cspFor, needsNonce } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * The prerendered paths that read no session: the crawler's files, the site's picture, the legal
 * pages and the API reference. None is protected and none redirects a signed-in person, so the
 * claims `updateSession` verifies are thrown away — while a crawler pulling the sitemap still paid
 * for a signature check. They keep the frame rule every page gets; only the session lookup goes.
 */
const SESSIONLESS_PATHS = new Set(["/robots.txt", "/sitemap.xml", "/opengraph-image", "/privacy", "/terms", "/docs/api"]);

/** Whether this path has any use for the session the proxy would refresh. */
export function needsSession(pathname: string): boolean {
    const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    return !SESSIONLESS_PATHS.has(path);
}

// Next 16's proxy (the file it used to call middleware), in src/ because that is where the dev
// server looks when the app lives under src/; a copy at the root ran in production only.
export async function proxy(request: NextRequest) {
    if (!needsSession(request.nextUrl.pathname)) {
        // No session read at all — these pages have no user to draw. The one rule every page has
        // stands, and X-Frame-Options from next.config.mjs covers the older browsers.
        const response = NextResponse.next({ request });
        response.headers.set("content-security-policy", "frame-ancestors 'none'");
        return response;
    }

    if (!needsNonce(request.nextUrl.pathname)) {
        // The public pages: no inline script of ours to sign, so only the one rule every page
        // has, that nothing may frame the site.
        const response = await updateSession(request);
        response.headers.set("content-security-policy", "frame-ancestors 'none'");
        return response;
    }

    // One nonce per request. On the request Next's own scripts find the policy and sign
    // themselves with the nonce; on the response the browser enforces it.
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const csp = cspFor(nonce);
    request.headers.set("content-security-policy", csp);
    const response = await updateSession(request);
    response.headers.set("content-security-policy", csp);
    return response;
}

export const config = {
    // Run on all routes except static assets, image files, /api and /_vercel. Everything under
    // /api/v1 is rewritten to the previous Cardorb app (see vercel.json), so a session refresh
    // there is wasted; `_vercel` is the platform's own path (the Speed Insights script and the
    // measurements it posts back), which has no session to refresh and no page to frame.
    matcher: ["/((?!_next/static|_next/image|_vercel|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
