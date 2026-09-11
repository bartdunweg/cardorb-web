import Image from "next/image";

/**
 * The back of a card, for a card the catalogue knows and cannot show.
 *
 * A grey box with the name in it read as "nothing here"; the back reads as "a card, face
 * down" — which is what it is: a real printing whose scan no catalogue has yet. On the Chinese
 * shelves that is most of a set (44 of 60 sampled cards, 2026-09-11), and the odd card on the
 * Japanese and English ones. The name and number stay in the caption under the tile, as they do
 * under every card, so the back carries no text and says nothing a screen reader needs: `alt=""`.
 *
 * The picture is the official one, from tcg.pokemon.com, shipped as a static file: 660 × 921,
 * exactly a card's 63 × 88, served resized by the optimizer like every other card. Nothing is
 * fetched from anyone else's server on the way.
 *
 * Fills its parent, which sets the box (`relative`, `aspect-card`), the way CardImage does.
 */
export function CardBack({
    width = 256,
    sizes,
    priority = false,
    className,
}: {
    /** The widest the layout draws this, in CSS pixels — the optimizer's hint, not the box. */
    width?: number;
    sizes?: string;
    priority?: boolean;
    className?: string;
}) {
    return (
        <Image
            src="/card-back.jpg"
            alt=""
            width={width}
            height={Math.round((width * 88) / 63)}
            sizes={sizes}
            priority={priority}
            quality={60}
            className={`h-full w-full object-cover ${className ?? ""}`}
        />
    );
}
