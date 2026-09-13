"use client";

import { useState } from "react";
import { CardImage } from "@/components/app/card-image";
import { cx } from "@/utils/cx";

/**
 * A set's logo, drawn to the same visual weight whatever its shape.
 *
 * Fitted to its box with `object-contain` a wide wordmark ran edge to edge and a round one (the
 * black star, Pokémon GO) filled the height, so a shelf of them read as big and small logos when
 * every set is one tile (Bart, 2026-09-13: "alle logo's van sets een beetje verschillende sizing").
 * So once the picture's own proportions are known it is given a share of the box's area rather
 * than all of its width or height: a wide logo gets the full width and a short height, a square
 * one a narrower, taller box, and both cover about the same surface. Until it has loaded it takes
 * the whole box, which is what it looked like before.
 */
export function SetLogo({
    src,
    width,
    priority = false,
    className,
    boxRatio,
    area = 0.5,
}: {
    src: string;
    /** The widest the logo is drawn, for the optimizer (see CardImage). */
    width: number;
    priority?: boolean;
    className?: string;
    /** The box's width over its height: 4/3 for a Browse tile, 3 for a set page's band. */
    boxRatio: number;
    /** How much of the box's area a logo covers, 0 to 1. */
    area?: number;
}) {
    const [ratio, setRatio] = useState<number | null>(null);
    let w = 1;
    let h = 1;
    if (ratio) {
        // Width and height as shares of the box, with w * h = area and the logo's own proportions.
        w = Math.sqrt((area * ratio) / boxRatio);
        h = Math.sqrt((area * boxRatio) / ratio);
        // Never past the box: the side that would overflow is held at the edge and the other follows.
        if (w > 1) {
            h /= w;
            w = 1;
        }
        if (h > 1) {
            w /= h;
            h = 1;
        }
    }
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div style={{ width: `${w * 100}%`, height: `${h * 100}%` }}>
                <CardImage
                    src={src}
                    alt=""
                    width={width}
                    ratio="square"
                    priority={priority}
                    className={cx("object-contain", className)}
                    onLoad={(img) => {
                        if (img?.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
                    }}
                />
            </div>
        </div>
    );
}
