import { BOOT_SCRIPT_HASH } from "@/lib/theme-script";

/**
 * The script policy for the signed-in and auth pages: one nonce per request, minted in the
 * middleware and named in the Content-Security-Policy. Next finds the policy on the request and
 * signs its own scripts with the nonce; the one inline script of ours, the theme boot script in
 * the root layout, is allowed by its hash instead, so it needs nothing per request.
 *
 * The public pages are not covered: they prerender, and a nonce is per request. They get
 * `frame-ancestors 'none'` from the proxy, and every path, including the ones the proxy's matcher
 * skips, gets X-Frame-Options from next.config.mjs.
 */

/**
 * The routes that render per request; the proxy mints a nonce only for these, and only for a path
 * that is one of them. A path *under* one that is no route (/dashboard/nope, /login/anything) is
 * served the prerendered 404 page, whose scripts carry no nonce; under a nonce policy they would be
 * blocked and the page would never hydrate. So the list is exact, and csp.test.ts walks src/app to
 * keep it so: a new page under (app) or (auth) fails the test until it is named here.
 */
export const NONCE_ROUTES: RegExp[] = [
    /^\/dashboard(\/(cards|collections|design|favorites|pokedex|sets|settings|wishlist|you))?$/,
    /^\/dashboard\/(collections|sets)\/[^/]+$/,
    /^\/(login|signup|forgot-password|reset-password)$/,
];

export const needsNonce = (pathname: string): boolean => NONCE_ROUTES.some((route) => route.test(pathname));

const IMAGE_HOSTS = [
    "https://*.supabase.co",
    "https://api.cardorb.com",
    "https://assets.tcgdex.net",
    "https://images.pokemontcg.io",
    "https://images.scrydex.com",
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
