import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * The one way this app reads or writes cards, folders and profiles: the Card Orb API at
 * api.cardorb.com (R-DATA-003). Supabase is touched directly for auth and the session only.
 *
 * The bearer token is the Supabase session's access token — the same project signs both, so the
 * API verifies it locally. The middleware refreshes the session on every request before a page
 * runs, so the token read here is a fresh one.
 */
export const API_URL = (process.env.CARDORB_API_URL ?? "https://api.cardorb.com/v1").replace(/\/$/, "");

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
    /** A token already in hand (inside `remembered()`), instead of reading the session. */
    token?: string;
};

/** The session, once per request: the access token and whose it is. Null when nobody is signed in. */
export const session = cache(async (): Promise<{ token: string; userId: string } | null> => {
    const supabase = await createClient();
    const {
        data: { session: s },
    } = await supabase.auth.getSession();
    return s ? { token: s.access_token, userId: s.user.id } : null;
});

export const accessToken = async (): Promise<string | null> => (await session())?.token ?? null;

/** The cache tag for everything this app remembers about one person. */
export const userTag = (userId: string) => `user:${userId}`;

/**
 * Remembered across requests, per person, for a minute.
 *
 * The layout asks the API for the profile, the folders and the numbers on every screen, and
 * the API answers each in a quarter of a second; three of those in a row is the pause a person
 * feels between clicking and seeing. Cached a minute, keyed by the person, and dropped by
 * `forgetMe()` after every write this app makes — so the iOS app's writes show up here within
 * a minute, and this app's own within a click.
 *
 * The token is an argument rather than read inside: what runs inside `unstable_cache` may not
 * touch cookies, and the cached value must not depend on which request filled it.
 */
export async function remembered<T>(name: string, read: (token: string) => Promise<T>): Promise<T> {
    const s = await session();
    if (!s) throw new ApiError(401, "Sign in to see this.");
    return unstable_cache(read, [name, s.userId], { revalidate: 60, tags: [userTag(s.userId)] })(s.token);
}

/** After a write: forget what was remembered about the person who made it. */
export async function forgetMe(): Promise<void> {
    const s = await session();
    if (s) revalidateTag(userTag(s.userId), { expire: 0 });
}

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

    const res = await fetch(url, {
        method: init.method ?? "GET",
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        ...(withAuth ? { cache: "no-store" } : { next: { revalidate: 300 } }),
    });

    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        const message = (json as { error?: unknown } | null)?.error;
        throw new ApiError(res.status, typeof message === "string" ? message : `The API answered ${res.status}.`);
    }
    return json as T;
}
