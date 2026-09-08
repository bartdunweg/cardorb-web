import type { CookieOptions } from "@supabase/ssr";

/**
 * How the session cookie is written, for both clients that write it.
 *
 * `@supabase/ssr` defaults to `httpOnly: false`, because its browser client reads the session out
 * of the cookie with JavaScript. This app has no browser client: `@supabase/*` is imported by two
 * server modules and nothing else, and the token travels from the server as a bearer header
 * (`src/lib/api.ts`). Nothing here needs to read it from script — and that cookie is the bearer
 * for every read and write against the Card Orb API, so anything that could run on cardorb.com
 * could take the whole collection with it. Closed.
 *
 * `secure` only in production: over http on localhost the browser drops a secure cookie, and the
 * sign-in would fail in development for a reason nothing on screen explains.
 */
export const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
};
