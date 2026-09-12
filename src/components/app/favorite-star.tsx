import { Star01 } from "@untitledui/icons";

// The favourite mark, after the card's name: the kit's star, filled, in the text's own colour.
// It was quaternary grey, which is the colour this app uses for things you can ignore, and a
// star is the one mark on a tile that is there to be noticed. The icon is decorative; the text
// is what a screen reader gets.
export function FavoriteStar() {
    return (
        <>
            <Star01 aria-hidden="true" className="size-3.5 shrink-0 fill-current text-fg-primary" />
            <span className="sr-only">, favorite</span>
        </>
    );
}
