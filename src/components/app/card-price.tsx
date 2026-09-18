import { LISTING_NOTE, formatPrice } from "@/lib/format";

/**
 * Ours: one card's price as every list, tile and sheet shows it. TCGplayer's market figure where
 * there is one; where there is none and the card is listed (it has never sold), its lowest listing,
 * as "From €12.00", never as a market price (cardorb-api#561, Bart 2026-09-18). A screen reader
 * hears which one it is; the listing's note is also the hover title. Nothing where neither is known.
 */
export function CardPrice({ price, listing }: { price: number | null | undefined; listing?: number | null }) {
    if (price != null)
        return (
            <>
                <span className="sr-only">Market price </span>
                {formatPrice(price)}
            </>
        );
    if (listing == null) return null;
    return (
        <span title={LISTING_NOTE}>
            <span className="sr-only">{LISTING_NOTE}: </span>
            <span aria-hidden="true">From </span>
            {formatPrice(listing)}
        </span>
    );
}
