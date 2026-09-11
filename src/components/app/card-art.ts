/**
 * The pictures the sheet's head shows while stepping through a list: the card on screen, and the
 * one it replaced staying underneath until the new one has faded in.
 *
 * Pure, so the rule can be read and tested apart from the sheet. The layers are keyed by the scan's
 * address rather than by the card: the same picture stays the same `<img>` however the card behind
 * it is identified, and a different picture is always a fresh one.
 */
export type ArtLayer = { scan: string; blur: string };
export type ArtLayers = {
    /** The card on screen; null when it has no picture. */
    shown: ArtLayer | null;
    /** The one before it, kept underneath while `shown` is fetched; null once the fade has ended. */
    under: ArtLayer | null;
    /**
     * `shown` was `under` a moment ago: someone stepped back to the card that was still fading
     * out. Its picture has been on screen the whole time, so the browser will not report it
     * loaded again; whatever fades it in has to start on its own.
     */
    swapped: boolean;
};

export const NO_ART: ArtLayers = { shown: null, under: null, swapped: false };

type Pictured = { image_url: string | null; image_high_url?: string | null } | null | undefined;

/** The layers for the card now open. The same object back when nothing about the pictures changed. */
export function nextArt(art: ArtLayers, card: Pictured): ArtLayers {
    if (!card?.image_url) return art.shown === null && art.under === null ? art : NO_ART;
    const scan = card.image_high_url ?? card.image_url;
    if (art.shown?.scan === scan) return art;
    const shown = { scan, blur: card.image_url };
    // Underneath only what was there while the sheet stayed open: opening it anew has nothing to cross from.
    return { shown, under: art.shown, swapped: art.under?.scan === scan };
}

/** The layers in paint order: what is underneath first, the card on screen last. */
export function artStack(art: ArtLayers): { layer: ArtLayer; shown: boolean }[] {
    const out: { layer: ArtLayer; shown: boolean }[] = [];
    if (art.under) out.push({ layer: art.under, shown: false });
    if (art.shown) out.push({ layer: art.shown, shown: true });
    return out;
}
