import { Star01 } from "@untitledui/icons";

// The favourite mark, after the card's name: the kit's star, filled. The icon is decorative; the
// text is what a screen reader gets.
export function FavoriteStar() {
    return (
        <>
            <Star01 aria-hidden="true" className="size-3.5 shrink-0 fill-current text-fg-quaternary" />
            <span className="sr-only">, favorite</span>
        </>
    );
}
