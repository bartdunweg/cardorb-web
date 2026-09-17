import type { ForgetWrite } from "@/lib/cache-scopes";

/**
 * The cache forgotten without the page drawn again (`/api/forget-mine`). Best effort: a list that
 * could not forget still shows the right count, and the cache holds the old one five minutes at most.
 *
 * `write` names what was written, so only what it changes goes (`cache-scopes.ts`); a caller that
 * names nothing forgets everything.
 */
export const forgetMineQuietly = (write: ForgetWrite = "all") =>
    fetch(`/api/forget-mine?write=${write}`, { method: "POST" }).then(
        () => {
            if (CHANGES_COUNTS.has(write)) window.dispatchEvent(new Event(CARDS_CHANGED));
        },
        () => undefined,
    );

/**
 * The writes that move a number the sidebar shows: a card (the counts), a binder (the list and its
 * counts), and `all`, whose reach is not known. A Pokédex face or the profile changes none of them,
 * and the sidebar asked `/api/sidebar-counts` again for every swipe through a slot's cards.
 */
const CHANGES_COUNTS: ReadonlySet<ForgetWrite> = new Set<ForgetWrite>(["all", "cards", "binders"]);

/** Said on the window once a quiet write's cache is gone, for what reads its own numbers again (the sidebar). */
export const CARDS_CHANGED = "cardorb:cards-changed";
