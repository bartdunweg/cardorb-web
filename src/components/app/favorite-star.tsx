// The favourite mark. The glyph is decorative; the text is what a screen reader gets.
export function FavoriteStar() {
    return (
        <>
            <span aria-hidden="true" className="mr-1 text-tertiary">
                ★
            </span>
            <span className="sr-only">Favorite </span>
        </>
    );
}
