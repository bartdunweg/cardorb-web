"use client";

import { useState } from "react";
import Image from "next/image";
import { CardBack } from "@/components/app/card-back";

/**
 * A card picture, through Vercel's image optimizer rather than straight from the catalogue.
 *
 * The catalogues hand out one origin each and no CDN — TCGdex is a single server in France —
 * so a grid of a hundred cards used to make a hundred round trips there, every visit, at the
 * file's full size. Through `next/image` the optimizer fetches each picture once, resizes it to
 * what the layout actually draws and serves it from Vercel's cache after that; the catalogue
 * becomes a source instead of a bottleneck. The hosts it may fetch from are listed in
 * `next.config.mjs`, and mirrored here: a picture from anywhere else goes direct.
 *
 * Fills its parent, which must be `relative` with a set aspect ratio (a card is 63 × 88), so
 * the box exists before the picture lands and nothing jumps; `width` and `height` are the
 * optimizer's hint, not the box's size.
 *
 * Quality 60: the source is a scan of a printed card, and at the sizes drawn here 60 is not
 * told apart from 75 while the file is a third smaller (next.config.mjs lists the qualities).
 *
 * If the optimizer cannot get the file — the catalogue not answering when it first asks — the
 * browser is sent to the original URL instead, so a slow source costs one retry, never the card.
 */

const OPTIMISED_HOSTS = new Set([
    "assets.tcgdex.net",
    "images.pokemontcg.io",
    "images.scrydex.com",
    "limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
    "api.cardorb.com",
]);

function isOptimised(src: string): boolean {
    try {
        return OPTIMISED_HOSTS.has(new URL(src).hostname);
    } catch {
        return false;
    }
}

export function CardImage({
    src,
    alt,
    fallbackSrc,
    className,
    priority = false,
    quality = 60,
    sizes,
    width = 256,
    ratio = "card",
}: {
    src: string;
    alt: string;
    /**
     * What to try when the optimizer will not answer for `src`.
     *
     * Without it the fallback is `src` itself, unoptimized — and since the tiles began asking
     * for the high scan that is a 133 KB original per tile against 31 KB for the low one. On a
     * page of 129 that is 17 MB instead of 4, at exactly the moment the picture host is already
     * struggling, which is the only moment this path runs.
     */
    fallbackSrc?: string;
    className?: string;
    /** Only for a picture that is on screen at load, like the one open in the detail panel. */
    priority?: boolean;
    /** How wide the tile really is, per breakpoint. Without it the browser picks by pixel density and ignores the box. */
    sizes?: string;
    /** 60 for a thumbnail; 75 for a tile drawn large enough to show the difference (next.config.mjs lists both). */
    quality?: 60 | 75;
    /**
     * The widest the layout draws this, in CSS pixels. With a width and no `sizes` the optimizer
     * names two candidates (1x and 2x) rather than one per configured size: nine srcset entries
     * of ninety characters each, on every tile of a thousand-slot Pokédex, were most of that
     * page's HTML. The box the picture fills is the parent's, whatever the width says.
     */
    width?: number;
    /** A card is 63 by 88; a set logo or a badge is drawn square. */
    ratio?: "card" | "square";
}) {
    // Once the optimizer fails, the original is tried; when that fails too there is no picture.
    // A card then shows its back — a shelf hands out addresses it has not checked, and a 404
    // there is a real card with no scan, not a broken tile. A logo or a badge shows nothing.
    const [direct, setDirect] = useState(false);
    const [gone, setGone] = useState(false);
    if (gone) return ratio === "card" ? <CardBack width={width} sizes={sizes} priority={priority} /> : null;
    const height = ratio === "card" ? Math.round((width * 88) / 63) : width;
    // The lighter picture on the way down, where there is one to fall back to.
    const shown = direct ? (fallbackSrc ?? src) : src;

    return (
        <Image
            src={shown}
            alt={alt}
            width={width}
            height={height}
            className={`h-full w-full ${className ?? ""}`}
            sizes={sizes}
            priority={priority}
            quality={quality}
            unoptimized={direct || !isOptimised(shown)}
            onError={() => (direct || !isOptimised(shown) ? setGone(true) : setDirect(true))}
        />
    );
}
