import { type NextRequest } from "next/server";
import { NONCE_HEADER, cspFor, needsNonce } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    if (!needsNonce(request.nextUrl.pathname)) return updateSession(request);

    // One nonce per request. On the request it reaches the page (Theme) and Next's own scripts,
    // which read the policy from the request headers; on the response the browser enforces it.
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const csp = cspFor(nonce);
    request.headers.set(NONCE_HEADER, nonce);
    request.headers.set("content-security-policy", csp);
    const response = await updateSession(request);
    response.headers.set("content-security-policy", csp);
    return response;
}

export const config = {
    // Run on all routes except static assets, image files and /api. Everything under /api/v1 is
    // rewritten to the previous Cardorb app (see vercel.json), so a session refresh there is wasted.
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
