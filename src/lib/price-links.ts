/**
 * Where a person can check a card's price for themselves: the TCGplayer product the figure came
 * from. The app shows one figure from one market (cardorb-api#354), and a figure nobody can open is
 * a figure nobody can check. eBay's sold listings were linked beside it until 2026-09-12 and taken
 * out for now.
 */

/** TCGplayer's page for the product a figure came from; null where there is no product id. */
export const tcgplayerUrl = (productId: number | null | undefined): string | null =>
    productId == null ? null : `https://www.tcgplayer.com/product/${productId}`;
