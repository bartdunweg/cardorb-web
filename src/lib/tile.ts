/**
 * The surface of a tile on Home and the lists: the page's own ground, marked by a hairline ring and a
 * soft lift rather than a lighter colour. One class so the counts, the movers and the most valuable
 * cards are the same object. Plain module, no directive: server and client components both read it.
 */
export const TILE_SURFACE = "rounded-xl bg-page shadow-lift-xs ring-1 ring-primary ring-inset";
