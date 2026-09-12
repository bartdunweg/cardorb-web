/**
 * Browse's grid-or-list choice, in a cookie for the reason the card lists keep theirs there
 * (cards-view.ts): the server draws the chosen one, so nobody sees the tiles swap to rows
 * after the page has loaded.
 */
export const SETS_VIEW_COOKIE = "sets-view";

export type SetsViewMode = "grid" | "list";

// Grid until the cookie says list: a catalogue is led by its pictures.
export const parseSetsView = (raw: string | undefined): SetsViewMode => (raw === "list" ? "list" : "grid");
