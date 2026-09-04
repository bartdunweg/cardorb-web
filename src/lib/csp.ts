import { BOOT_SCRIPT_HASH } from "@/lib/theme-script";

/**
 * The script policy for the signed-in and auth pages: one nonce per request, minted in the
 * middleware and named in the Content-Security-Policy. Next finds the policy on the request and
 * signs its own scripts with the nonce; the one inline script of ours, the theme boot script in
 * the root layout, is allowed by its hash instead, so it needs nothing per request.
 *
 * The public pages are not covered: they prerender, and a nonce is per request. They keep the
 * headers next.config.mjs sets for every path (no framing, nosniff, referrer, permissions).
 */

/** The paths that render per request; the middleware mints a nonce only for these. */
export const NONCE_PATHS = ["/dashboard", "/login", "/signup", "/forgot-password", "/reset-password"];

export const needsNonce = (pathname: string): boolean => NONCE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const IMAGE_HOSTS = [
    "https://*.supabase.co",
    "https://api.cardorb.com",
    "https://assets.tcgdex.net",
    "https://images.pokemontcg.io",
    "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
];

/**
 * `'strict-dynamic'` lets a nonced or hashed script load what it needs; `'unsafe-inline'` and `https:` are
 * only read by browsers that know no nonces. `'unsafe-eval'` is for the dev server's tooling.
 */
export function cspFor(nonce: string, dev = process.env.NODE_ENV === "development"): string {
    return [
        "default-src 'self'",
        `script-src 'nonce-${nonce}' 'sha256-${BOOT_SCRIPT_HASH}' 'strict-dynamic' 'unsafe-inline' https:${dev ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
    ].join("; ");
}
