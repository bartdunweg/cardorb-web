import { cache } from "react";
import type { ZodType, output } from "zod";
import { createClient } from "@/lib/supabase/server";
import { timed } from "@/lib/timing";

/**
 * The one way this app reads or writes cards, folders and profiles: the Card Orb API at
 * api.cardorb.com (R-DATA-003). Supabase is touched directly for auth and the session only.
 *
 * The bearer token is the Supabase session's access token — the same project signs both, so the
 * API verifies it locally. The middleware refreshes the session on every request before a page
 * runs, so the token read here is a fresh one.
 */
export const API_URL = (process.env.CARDORB_API_URL ?? "https://api.cardorb.com/v1").replace(/\/$/, "");

/**
 * How long one call to the API may take. fetch() has no limit of its own, so an API that accepts
 * the connection and never answers would hold the page until Vercel's five-minute limit. Thirty
 * seconds is longer than the API's slowest honest answer — a cold rebuild of a large collection —
 * and shorter than anyone waits for a page. A timeout throws like any other failure, so a page
 * shows its error rather than a spinner.
 */
export const API_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        /**
         * Whatever else the failing answer carried, for the rare route that
         * says something useful in the body of a refusal. The CSV import's 400
         * sends back the file's header row and the columns it guessed at —
         * exactly what the screen needs to draw the mapping it is asking about —
         * and reading only `error` threw that away, leaving the client to ask a
         * question it had already been handed the answer to.
         */
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

/**
 * The answer did not look like what the route promised.
 *
 * Its own class, and status 500 rather than 502, because 502 already means something here: the
 * catalogue is down, and `sets.ts` shows a shelf's own message for it. A shape this app cannot
 * read is a different failure with a different fix, and quietly borrowing the catalogue's
 * status would send someone looking at the wrong system.
 */
export class ApiShapeError extends ApiError {
    constructor(message: string, issues: unknown) {
        super(500, message, issues);
        this.name = "ApiShapeError";
    }
}

type Params = Record<string, string | number | boolean | undefined>;

type Init = {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Params;
    /** false for the three unkeyed public routes; they are also cached for five minutes, under `tags`. */
    auth?: boolean;
    /** A token resolved earlier, for a call made inside a cache scope where `cookies()` is refused. */
    token?: string;
    /**
     * Longer than API_TIMEOUT_MS, for the one call that legitimately outlives it.
     * Committing a CSV import is thousands of inserts and the route allows five
     * minutes for them; timing out at thirty seconds would abandon a write that
     * is going to finish anyway and report it as a failure, which is the worst
     * thing this app could say about an operation nobody can undo.
     */
    timeoutMs?: number;
    /**
     * What the cached answer is filed under, so a write can throw it away before its five
     * minutes are up. Only the public routes have any: a call with a session is `no-store`,
     * where a tag would name nothing. Without one, a public route that stopped being public
     * kept answering from the cache for the rest of the window — the profile turned private
     * and still readable, which is the one thing a public page must get right.
     */
    tags?: string[];
    /**
     * What the answer must look like. Given one, `api()` parses instead of casting.
     *
     * CLAUDE.md asks for zod at every boundary and this was the boundary that had none:
     * `json as T` told TypeScript a shape and checked nothing, so a field the API renamed or
     * started sending as a string arrived in a component untouched. It surfaced as a blank
     * tile or a NaN, three layers from the cause. Parsing here turns that into one 502 that
     * names the field.
     *
     * Optional so a route can still be added without one; every route this app calls has one.
     */
    schema?: ZodType;
};

/**
 * Who is signed in and the token that proves it, once per request. Null when nobody is.
 *
 * getClaims() verifies the token's signature locally (ES256, the key set cached per process) the
 * way the middleware does; getSession() only decodes the cookie. The public profile runs this for
 * every visitor and keys a shared cache on the id, so a cookie that merely claims an id must not
 * count. The token itself comes from getSession() afterwards: getClaims() has refreshed it by then.
 */
export const session = cache(async (): Promise<{ userId: string; token: string } | null> => {
    const supabase = await createClient();
    const { data: claims } = await timed("session getClaims", () => supabase.auth.getClaims());
    const userId = claims?.claims.sub;
    if (!userId) return null;
    const {
        data: { session: s },
    } = await supabase.auth.getSession();
    return s ? { userId, token: s.access_token } : null;
});

/** The session's access token, once per request. Null when nobody is signed in. */
export const accessToken = async (): Promise<string | null> => (await session())?.token ?? null;

/**
 * Given a schema, the answer's type comes from the schema — there is no second place to state
 * it and so no way for the two to disagree. Without one, a caller still names the type it
 * expects and gets the old cast; every route this app calls passes a schema.
 */
export async function api<S extends ZodType>(path: string, init: Init & { schema: S }): Promise<output<S>>;
export async function api<T>(path: string, init?: Init): Promise<T>;
export async function api(path: string, init: Init = {}): Promise<unknown> {
    const url = new URL(`${API_URL}${path}`);
    for (const [key, value] of Object.entries(init.params ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const withAuth = init.auth !== false;
    if (withAuth) {
        const token = init.token ?? (await accessToken());
        if (!token) throw new ApiError(401, "Sign in to see this.");
        headers.authorization = `Bearer ${token}`;
    }
    if (init.body !== undefined) headers["content-type"] = "application/json";

    // Timed to the last byte: a large answer costs more to receive and parse than to wait for.
    const { res, json } = await timed(`api ${init.method ?? "GET"} ${path}`, async () => {
        const res = await fetch(url, {
            method: init.method ?? "GET",
            headers,
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            signal: AbortSignal.timeout(init.timeoutMs ?? API_TIMEOUT_MS),
            ...(withAuth ? { cache: "no-store" } : { next: { revalidate: 300, tags: init.tags } }),
        });
        const json: unknown = await res.json().catch(() => null);
        return { res, json };
    });
    if (!res.ok) {
        const message = (json as { error?: unknown } | null)?.error;
        throw new ApiError(res.status, typeof message === "string" ? message : `The API answered ${res.status}.`, json ?? undefined);
    }
    if (!init.schema) return json;

    const parsed = init.schema.safeParse(json);
    if (parsed.success) return parsed.data;

    // The first issue names the field, which is the whole point of parsing here rather than
    // letting the value travel three layers and surface as a blank tile.
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join(".") : "the answer";
    throw new ApiShapeError(`The API answered something unexpected (${where}: ${issue?.message ?? "invalid"}).`, parsed.error.issues);
}
