import { session } from "@/lib/api";
import { getFavoritesCount, getMyFolders } from "@/lib/collections";

/**
 * The sidebar's numbers, read again: every binder's count and the favourites'.
 *
 * For after a write that did not draw the page again (the plus and the minus under a tile, a
 * heart): the layout's own read is from before it, so the sidebar asks for its numbers on its own.
 * Nothing is forgotten here, so nothing is drawn again; the cache was dropped by /api/forget-mine
 * before this is asked, so the reads are fresh.
 *
 * A route and not a server action. Next runs a page's actions one at a time, so this read, 4 s on
 * 2026-09-16, held back the next press's write for as long as it took. A fetch waits for nothing.
 */
export async function GET() {
    if (!(await session())) return new Response(null, { status: 401 });
    const [collections, favorites] = await Promise.all([getMyFolders().catch(() => []), getFavoritesCount().catch(() => null)]);
    return Response.json({ collections, favorites }, { headers: { "Cache-Control": "no-store" } });
}
