/**
 * The script policy for the signed-in and auth pages: one nonce per request, minted in the
 * middleware, carried to the page in a request header, and named in the response's
 * Content-Security-Policy. Next signs its own scripts with it when it finds the policy on the
 * request; next-themes' inline script gets it through the Theme provider.
 *
 * The public pages are not covered: they prerender, and a nonce is per request. They keep the
 * headers next.config.mjs sets for every path (no framing, nosniff, referrer, permissions).
 */

export const NONCE_HEADER = "x-nonce";

/** The paths whose pages read `nonceFrom(headers())`; the middleware mints a nonce only for these. */
export const NONCE_PATHS = ["/dashboard", "/login", "/signup", "/forgot-password", "/reset-password"];

export const needsNonce = (pathname: string): boolean => NONCE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const nonceFrom = (h: Headers): string | undefined => h.get(NONCE_HEADER) ?? undefined;

const IMAGE_HOSTS = [
    "https://*.supabase.co",
    "https://api.cardorb.com",
    "https://assets.tcgdex.net",
    "https://images.pokemontcg.io",
    "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
];

/**
 * `'strict-dynamic'` lets a nonced script load what it needs; `'unsafe-inline'` and `https:` are
 * only read by browsers that know no nonces. `'unsafe-eval'` is for the dev server's tooling.
 */
export function cspFor(nonce: string, dev = process.env.NODE_ENV === "development"): string {
    return [
        "default-src 'self'",
        `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:${dev ? " 'unsafe-eval'" : ""}`,
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
