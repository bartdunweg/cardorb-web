import { cache } from "react";
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
};

/** The session's access token, once per request. Null when nobody is signed in. */
export const accessToken = cache(async (): Promise<string | null> => {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
});

export async function api<T>(path: string, init: Init = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [key, value] of Object.entries(init.params ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const withAuth = init.auth !== false;
    if (withAuth) {
        const token = await accessToken();
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
