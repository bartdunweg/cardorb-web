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
 * If the optimizer cannot get the file — the catalogue not answering when it first asks — the
 * browser is sent to the original URL instead, so a slow source costs one retry, never the card.
 */

const OPTIMISED_HOSTS = new Set(["assets.tcgdex.net", "images.pokemontcg.io", "limitlesstcg.nyc3.cdn.digitaloceanspaces.com", "api.cardorb.com"]);

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
}: {
    src: string;
    alt: string;
    /** The width the layout draws this at, per breakpoint — what decides which size is fetched. */
    sizes: string;
    className?: string;
    /** Only for a picture that is on screen at load, like the one open in the detail panel. */
    priority?: boolean;
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
            unoptimized={direct || !isOptimised(src)}
            onError={() => setDirect(true)}
        />
    );
}
