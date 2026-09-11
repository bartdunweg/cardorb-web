import { BOOT_SCRIPT_HASH } from "@/lib/theme-script";

/**
 * The script policy for the signed-in and auth pages: one nonce per request, minted in the
 * middleware and named in the Content-Security-Policy. Next finds the policy on the request and
 * signs its own scripts with the nonce; the one inline script of ours, the theme boot script in
 * the root layout, is allowed by its hash instead, so it needs nothing per request.
 *
 * The public profile is covered too, and was not: this said the public pages prerender, and
 * `/user/[username]` does not — it reads cookies for the viewer, so it renders per request and a
 * nonce is there for the asking. It was the one page missing a script policy while rendering
 * another person's chosen words and a hundred catalogue card names. The pages that really do
 * prerender — the landing page, the legal pages, the docs — cannot take one, and keep
 * `frame-ancestors 'none'` from the proxy; every path gets X-Frame-Options from next.config.mjs.
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
    // A username that belongs to nobody renders `notFound()` inside this same per-request render,
    // so Next signs that page's scripts with the same nonce. It is not the prerendered 404 the
    // paths below fall to.
    /^\/user\/[^/]+$/,
];

export const needsNonce = (pathname: string): boolean => NONCE_ROUTES.some((route) => route.test(pathname));

/**
 * The avatar bucket, and only ours. It read `https://*.supabase.co`, which let any Supabase
 * project's public bucket be embedded on cardorb.com. Taken from the environment rather than
 * written down, so a preview or a second project needs no edit here; the wildcard stands only if
 * the variable is missing, which is a build that cannot talk to Supabase anyway.
 */
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "https://*.supabase.co";

/**
 * The API this build talks to, for the Pokédex artwork it serves (`artwork_url` on
 * /public/species). Production is api.cardorb.com, named below anyway; this is for a build
 * pointed at a preview or a local API, whose pictures come from that host and were blocked here.
 */
const API_HOST = process.env.CARDORB_API_URL ? new URL(process.env.CARDORB_API_URL).origin : "https://api.cardorb.com";

const IMAGE_HOSTS = [
    ...new Set([
        SUPABASE_HOST,
        API_HOST,
        "https://api.cardorb.com",
        "https://assets.tcgdex.net",
        "https://images.pokemontcg.io",
        "https://images.scrydex.com",
        "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
    ]),
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
