/**
 * The table-or-grid choice on the card lists, kept in a cookie rather than localStorage so the
 * server renders the chosen view. From localStorage the server could only guess "table", and a
 * grid person got a table in the HTML, a swap after hydration, and their first pictures not in
 * the first paint.
 */
export const CARDS_VIEW_COOKIE = "cards-view";

export type CardsViewMode = "table" | "grid";

export const parseCardsView = (raw: string | undefined): CardsViewMode => (raw === "grid" ? "grid" : "table");
