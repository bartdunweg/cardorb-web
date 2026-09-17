import { forgetWriteSchema } from "@/lib/cache-scopes";
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
 * `?write=` names what was written (`cards`, `favorite`, `binders`, `profile`, `dexFace`, `all`), and only what that
 * changes is forgotten (`cache-scopes.ts`): a plus on a tile keeps the profile. No `write` is
 * `all`, as it was before writes were told apart; a name this route does not know is a 400.
 *
 * Only the caller's own cache, found from their session; no session is a 401. It changes nothing
 * but a cache, and it must come from this site's own pages (the Origin a browser sends with a
 * fetch), so another site cannot have a visitor's browser empty it.
 */
export async function POST(request: Request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    // Compared as strings: `Origin: null` (a sandboxed frame) is no URL, and parsing it threw a 500.
    if (origin !== url.origin) return new Response(null, { status: 403 });
    const write = forgetWriteSchema.safeParse(url.searchParams.get("write") ?? "all");
    if (!write.success) return new Response(null, { status: 400 });
    const began = Date.now();
    const forgotten = await forgetMineLater(write.data);
    console.log(`[probe] ${Date.now()} forget-mine ${write.data} began ${began}`);
    return new Response(null, { status: forgotten ? 204 : 401 });
}
