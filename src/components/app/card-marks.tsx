import { Heart, Star01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

/**
 * Ours: what a card in your own lists is marked with, stamped on its picture: the pink heart for a
 * wish, a star for a favourite. It stood as a star after the name, and a wish had a pressable heart
 * under it; on your own lists these are states to see, not things to press there (Bart's call,
 * 2026-09-18). A button to wish for a card stays where you find one: Browse, a set's page, search.
 *
 * On the page's own disc (white, dark in dark mode), in the bottom right corner. Mobbin's shops mark a saved photo that way (Etsy, Nike,
 * Viator, Vinted, Shop): white reads on any picture, where a coloured disc sank into card art of its
 * own colour. The bottom right, because the top right of a Pokémon card is its HP and type, which the
 * mark covered; the bottom holds the small print. The heart keeps the wishlist's pink (3.5:1 on
 * white), the star takes the text's colour, since yellow on white is 1.7:1. The marks are decorative; the words
 * say them to a screen reader (`CardMarksText`).
 */
export function CardMarks({ favorite, wished }: { favorite: boolean; wished: boolean }) {
    if (!favorite && !wished) return null;
    return (
        <span aria-hidden="true" className="pointer-events-none absolute right-1.5 bottom-1.5 flex gap-1">
            {wished ? <Mark icon={Heart} tone="text-pink-500" /> : null}
            {favorite ? <Mark icon={Star01} tone="text-fg-primary" /> : null}
        </span>
    );
}

function Mark({ icon: Icon, tone }: { icon: typeof Heart; tone: string }) {
    return (
        <span className={cx("flex size-6 items-center justify-center rounded-full bg-primary shadow-sm", tone)}>
            <Icon className="size-3.5 fill-current" />
        </span>
    );
}

/** The marks in words, beside the card's name, for a screen reader. */
export function CardMarksText({ favorite, wished }: { favorite: boolean; wished: boolean }) {
    return (
        <>
            {wished ? <span className="sr-only">, on your wishlist</span> : null}
            {favorite ? <span className="sr-only">, favorite</span> : null}
        </>
    );
}
