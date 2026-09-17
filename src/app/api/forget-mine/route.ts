import { forgetMineLater } from "@/lib/user-cache";

/**
 * After a write a list already shows, the signed-in person's cached answers go, and nothing on the
 * screen is drawn again.
 *
 * A route rather than a server action, because an action that drops a tag hands the page back
 * redrawn: a list you were stepping copies on, two hundred tiles down, started again from its
 * first batch and read every batch back in. Fetched from the tile, this answers the fetch and
 * nothing else, and the next screen you open reads fresh.
 *
 * Only the caller's own cache, found from their session; no session is a 401. It takes nothing in
 * and changes nothing but a cache, and it must come from this site's own pages (the Origin a
 * browser sends with a fetch), so another site cannot have a visitor's browser empty it.
 */
export async function POST(request: Request) {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403 });
    const forgotten = await forgetMineLater();
    return new Response(null, { status: forgotten ? 204 : 401 });
}
