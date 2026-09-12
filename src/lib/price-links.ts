/**
 * Where a person can check a card's price for themselves.
 *
 * The app shows one figure from one market (TCGplayer, since cardorb-api#354). A figure nobody
 * can open is a figure nobody can check, so the sheet links to the page it came from, and to what
 * the card actually sold for on eBay: a second opinion from finished sales rather than listings,
 * and the only free place a graded copy's price can be read, since neither market publishes one.
 */

type Named = { name: string; set_name: string | null; number: string | null };

/** eBay's category for single Pokémon cards, so a search does not answer with booster boxes. */
const POKEMON_SINGLES = "183454";

/**
 * eBay's finished, sold listings for this card.
 *
 * `.com` rather than a local site: that is where the volume is, and TCGplayer, whose figure this
 * sits beside, is the American market too. Plain searches exclude the three big grading companies
 * so the sales read against an ungraded price; `psa10` asks for those slabs and nothing else.
 */
export function ebaySoldUrl(card: Named, graded?: "psa10"): string {
    const words = [card.name, card.set_name, card.number, graded === "psa10" ? "PSA 10" : "-PSA -BGS -CGC"].filter(Boolean);
    const url = new URL("https://www.ebay.com/sch/i.html");
    url.searchParams.set("_nkw", words.join(" "));
    url.searchParams.set("_sacat", POKEMON_SINGLES);
    url.searchParams.set("LH_Sold", "1");
    url.searchParams.set("LH_Complete", "1");
    return url.toString();
}

/** TCGplayer's page for the product a figure came from; null where there is no product id. */
export const tcgplayerUrl = (productId: number | null | undefined): string | null =>
    productId == null ? null : `https://www.tcgplayer.com/product/${productId}`;
