import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
    CARDS_GROUP_COOKIE,
    CARDS_SIZE_COOKIE,
    CARDS_VIEW_COOKIE,
    type CardsGroup,
    type CardsSize,
    type CardsViewMode,
    parseCardsGroup,
    parseCardsSize,
    parseCardsView,
} from "@/lib/cards-view";
import { LIST_MEMORY_COOKIE, memoryKey, parseListMemory } from "@/lib/list-memory";

/**
 * The server's side of `use-list-memory`: what a page remembers, read from the cookie for the
 * first paint. `next/headers` keeps this out of `list-memory.ts`, which the browser imports too.
 */

/** The View menu as this page was left; a page never chosen on takes the last choice made anywhere. */
export async function rememberedView(pathname: string): Promise<{ view: CardsViewMode; size: CardsSize; group: CardsGroup }> {
    const jar = await cookies();
    const page = parseListMemory(jar.get(LIST_MEMORY_COOKIE)?.value)[memoryKey(pathname)];
    return {
        view: page?.view ?? parseCardsView(jar.get(CARDS_VIEW_COOKIE)?.value),
        size: page?.size ?? parseCardsSize(jar.get(CARDS_SIZE_COOKIE)?.value),
        group: page?.group ?? parseCardsGroup(jar.get(CARDS_GROUP_COOKIE)?.value),
    };
}

/**
 * A list's bare address opens the list as it was left: the sort, the filters and the search go
 * back into the URL, where they live, and the page draws from there. Only a bare address: one
 * with anything in its query, `?sort=name` or `?q=`, is a choice already made, and a cleared list
 * has no query in the memory either, so it stays clear. In the browser the links are rewritten
 * before they are followed (`withListQuery`); this is for the address typed in, the bookmark
 * and the tab restored by the browser.
 */
export async function openAsLeft(pathname: string, params: object): Promise<void> {
    if (Object.keys(params).length > 0) return;
    /* Only a document: the address typed in, the bookmark, the restored tab. A client navigation
       to the bare address is a choice made in the app (the search field emptied, the last filter or
       the sort taken off, each a `router.replace` of the bare path), and the cookie still holds what
       was just cleared, since it is written after the navigation lands; answering that with a
       redirect put the term back in the field. The router's own `RSC` header never reaches a page
       (Next keeps it), but the browser's `Sec-Fetch-Dest` does: `document` for a navigation, `empty`
       for the router's fetch. A client that sends none (curl, an old Safari) is read as a document. */
    const dest = (await headers()).get("sec-fetch-dest");
    if (dest && dest !== "document") return;
    const query = parseListMemory((await cookies()).get(LIST_MEMORY_COOKIE)?.value)[memoryKey(pathname)]?.query;
    if (query) redirect(`${pathname}?${query}`);
}
