import { Heart, Star01 } from "@untitledui/icons";
import { MARK_ON } from "@/components/app/tile-icon-button";
import { cx } from "@/utils/cx";

/**
 * Ours: what a card in your own lists is marked with, stamped on its picture's corner. A favourite
 * wears the yellow star, a wish the pink heart, in the colours their buttons have when set
 * (tile-icon-button.tsx), so a mark reads the same wherever it is. It stood as a star after the
 * name, and a wish had a pressable heart under it; on your own lists these are states to see, not
 * things to press there (Bart's call, 2026-09-18). A button to wish for a card stays where you find
 * one: Browse, a set's page, the search. The marks are decorative; the words say them to a screen
 * reader (`CardMarksText`).
 */
export function CardMarks({ favorite, wished }: { favorite: boolean; wished: boolean }) {
    if (!favorite && !wished) return null;
    return (
        <span aria-hidden="true" className="pointer-events-none absolute top-1.5 right-1.5 flex gap-1">
            {wished ? <Mark icon={Heart} tone={MARK_ON.wishlist} /> : null}
            {favorite ? <Mark icon={Star01} tone={MARK_ON.favorite} /> : null}
        </span>
    );
}

function Mark({ icon: Icon, tone }: { icon: typeof Heart; tone: string }) {
    return (
        <span className={cx("flex size-6 items-center justify-center rounded-full shadow-xs", tone)}>
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
