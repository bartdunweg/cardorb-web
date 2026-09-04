import { cache } from "react";
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
    ) {
        super(message);
        this.name = "ApiError";
    }
}

type Params = Record<string, string | number | boolean | undefined>;

type Init = {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Params;
    /** false for the three unkeyed public routes; they are also cached for five minutes. */
    auth?: boolean;
    /** A token resolved earlier, for a call made inside a cache scope where `cookies()` is refused. */
    token?: string;
};

/** Who is signed in and the token that proves it, once per request. Null when nobody is. */
export const session = cache(async (): Promise<{ userId: string; token: string } | null> => {
    const supabase = await createClient();
    const {
        data: { session: s },
    } = await timed("session getSession", () => supabase.auth.getSession());
    return s ? { userId: s.user.id, token: s.access_token } : null;
});

/** The session's access token, once per request. Null when nobody is signed in. */
export const accessToken = async (): Promise<string | null> => (await session())?.token ?? null;

export async function api<T>(path: string, init: Init = {}): Promise<T> {
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
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
            ...(withAuth ? { cache: "no-store" } : { next: { revalidate: 300 } }),
        });
        const json: unknown = await res.json().catch(() => null);
        return { res, json };
    });
    if (!res.ok) {
        const message = (json as { error?: unknown } | null)?.error;
        throw new ApiError(res.status, typeof message === "string" ? message : `The API answered ${res.status}.`);
    }
    return json as T;
}
