"use client";

import { useState } from "react";
import Image from "next/image";

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
 * the box exists before the picture lands and nothing jumps.
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
    sizes,
    className,
    priority = false,
    quality = 60,
}: {
    src: string;
    alt: string;
    /** The width the layout draws this at, per breakpoint — what decides which size is fetched. */
    sizes: string;
    className?: string;
    /** Only for a picture that is on screen at load, like the one open in the detail panel. */
    priority?: boolean;
    /** 60 for a thumbnail; 75 for a tile drawn large enough to show the difference (next.config.mjs lists both). */
    quality?: 60 | 75;
}) {
    const [direct, setDirect] = useState(false);

    return (
        <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className={className}
            priority={priority}
            quality={quality}
            unoptimized={direct || !isOptimised(src)}
            onError={() => setDirect(true)}
        />
    );
}
