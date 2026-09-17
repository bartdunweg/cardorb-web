import { API_TIMEOUT_MS, API_URL, accessToken } from "@/lib/api";

/**
 * The collection as a file, from the API (R-DATA-003), handed on as it came.
 *
 * A route handler rather than a server action, because a download is a plain
 * link: the browser follows it and saves what comes back, with the name the
 * Content-Disposition header gives. An action would hand the bytes to
 * JavaScript, which would then have to make a blob and click a link it made,
 * which is the long way round to what a link does on its own.
 *
 * The session's token goes along as a bearer, the way every call in api.ts
 * does; the browser never sees the API's address or the token.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    const token = await accessToken();
    if (!token) return new Response("Sign in to export your collection.", { status: 401 });

    const unreadable = (status = 503) => new Response("Your collection could not be read. Try again in a moment.", { status });
    let res: Response;
    try {
        res = await fetch(`${API_URL}/collection/export`, {
            headers: { authorization: `Bearer ${token}`, accept: "text/csv" },
            cache: "no-store",
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
        });
    } catch {
        // No answer at all (the API down, or the timeout): the same words as a refusal, not a bare 500.
        return unreadable();
    }
    if (!res.ok) return unreadable(res.status === 401 ? 401 : 503);

    return new Response(res.body, {
        headers: {
            "content-type": res.headers.get("content-type") ?? "text/csv; charset=utf-8",
            "content-disposition": res.headers.get("content-disposition") ?? 'attachment; filename="cardorb.csv"',
            "cache-control": "private, no-store",
        },
    });
}
