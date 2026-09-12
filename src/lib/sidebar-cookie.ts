/**
 * Whether the desktop sidebar is folded to its rail, kept in a cookie rather than local storage
 * so the server draws the first paint right: decided in the browser it would open wide and snap
 * shut after hydration on every page. "collapsed" folds it; no cookie is open.
 *
 * Its own module, with no "use client": the layout (a Server Component) reads the name too, and
 * a value imported from a client module arrives there as a client reference, not a string.
 */
export const SIDEBAR_COOKIE = "sidebar";
