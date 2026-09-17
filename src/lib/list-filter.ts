/**
 * The most cards one read of a list may ask for: the API's ceiling for an owner.
 *
 * On its own, without zod: the card list reads it in the browser, and the schema that enforces it
 * (`loadMoreInput`) is in list-filter-schema.ts, which only the server imports.
 */
export const MORE_CEILING = 2000;
