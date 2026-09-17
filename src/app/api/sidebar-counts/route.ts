import { session } from "@/lib/api";
import { getFavoritesCount, readMyBinders } from "@/lib/binders";

/**
 * The sidebar's numbers, read again: every binder's count and the favourites'.
 *
 * For after a write that did not draw the page again (the plus and the minus under a tile, a
 * heart): the layout's own read is from before it, so the sidebar asks for its numbers on its own.
 * Nothing is forgotten here, so nothing is drawn again; the cache was dropped by /api/forget-mine
 * before this is asked, so the reads are fresh.
 *
 * A binders read that fails answers `binders: null`, not an empty list: an empty list is a
 * person with no binders, and the sidebar took it at its word and wiped the ones the layout drew.
 * With null it keeps those, and only the favourites' number is put over them.
 *
 * A route and not a server action. Next runs a page's actions one at a time, so this read, 4 s on
 * 2026-09-16, held back the next press's write for as long as it took. A fetch waits for nothing.
 */
export async function GET() {
    if (!(await session())) return new Response(null, { status: 401 });
    const [binders, favorites] = await Promise.all([
        readMyBinders().catch((err: unknown) => {
            console.error("Binders unavailable, sidebar keeps the list it has:", err instanceof Error ? err.message : err);
            return null;
        }),
        getFavoritesCount().catch(() => null),
    ]);
    return Response.json({ binders, favorites }, { headers: { "Cache-Control": "no-store" } });
}
