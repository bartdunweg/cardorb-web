/**
 * The table-or-grid choice on the card lists, kept in a cookie rather than localStorage so the
 * server renders the chosen view. From localStorage the server could only guess "table", and a
 * grid person got a table in the HTML, a swap after hydration, and their first pictures not in
 * the first paint.
 */
export const CARDS_VIEW_COOKIE = "cards-view";

export type CardsViewMode = "table" | "grid";

// Grid until the cookie says table: the pictures are the collection, the table is the ledger.
export const parseCardsView = (raw: string | undefined): CardsViewMode => (raw === "table" ? "table" : "grid");

/** How big a tile is in the grid. A cookie for the same reason as the view. */
export const CARDS_SIZE_COOKIE = "cards-size";

export type CardsSize = "sm" | "md" | "lg";

export const parseCardsSize = (raw: string | undefined): CardsSize => (raw === "sm" || raw === "lg" ? raw : "md");

/**
 * Where the grid's own numbers live, rather than in the component that draws it.
 *
 * `cards-grid.tsx` is a client component, and a server component importing a plain value out of
 * one gets a client reference, not the value: the set page read `GRID_COLUMNS.md` as `undefined`
 * and drew one card per row at 639 pixels wide. Nothing failed — the class string was the word
 * "undefined". A module with no directive can be read from both sides.
 */
/**
 * The widest a tile is drawn at each size, in CSS pixels, measured on the live grid.
 *
 * This is the number that decides the file, and it was not being passed: `CardImage`'s default
 * of 256 asks for 512 at 2x, there is no 512 rung, and it rounds up to 640 — a 600 px scan at
 * 50 KB where a 192 px tile needs 384 px and 24 KB. Forty-eight tiles carried an extra 1.25 MB
 * nobody's screen could show, and the Pokédex's ninety-six carried 2.5 MB.
 *
 * `lg` genuinely wants 640: it draws at 296. The other two are thumbnails and take quality 60
 * for the same reason, which is what `set-card-tile` was already doing alone.
 */
export const TILE_WIDTH: Record<CardsSize, number> = { sm: 128, md: 192, lg: 256 };

export const GRID_COLUMNS: Record<CardsSize, string> = {
    sm: "grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8",
    md: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    lg: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
};
