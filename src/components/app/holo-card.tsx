"use client";

import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { useHoloTilt } from "@/lib/holo/use-holo-tilt";
import { holoVariant } from "@/lib/holo/variant";
import "@/styles/holo.css";
import { cx } from "@/utils/cx";

/**
 * A card that tilts under the pointer and shines like its printing: the one surface in the app
 * that moves on hover, on purpose. The picture goes in as the child; the shine and the glare are
 * drawn over it by the vendored effect (src/styles/vendor/pokemon-cards-css), which picks its
 * look from the data attributes set here. The tilt is decorative: nothing here takes focus or a
 * click, and a keyboard user sees the same card, lying flat.
 */
export function HoloCard({
    rarity,
    finish,
    foilPattern = null,
    facts,
    number,
    types,
    gen,
    tilt = false,
    className,
    children,
}: {
    rarity: string | null;
    finish: string | null;
    /** What this copy's foil is, where anything recorded it; it overrules the guess from `gen`. */
    foilPattern?: string | null;
    facts: { stage: string | null; hp?: number | null } | null;
    number: string | null;
    types: string[] | null;
    /** The series the card was printed in; the picture's window and the holo's pattern follow it. */
    gen: string | null;
    /** True once the phone may be read (iOS asks first); the hook attaches the sensor when it flips. */
    tilt?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const card = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    useHoloTilt(card, surface, { orientationGranted: tilt });
    // Where a starry foil starts: once per card, so it does not jump on a re-render.
    const [seed] = useState(() => ({ x: Math.random(), y: Math.random() }));
    const v = holoVariant(rarity, finish, facts, { number, types, gen }, foilPattern);

    return (
        <div
            ref={card}
            className={cx("card interactive holo-card", ...v.typeClasses, className)}
            data-rarity={v.rarity}
            data-subtypes={v.subtypes}
            data-supertype={v.supertype}
            data-trainer-gallery={v.trainerGallery ? "true" : undefined}
            style={
                {
                    ...v.style,
                    "--seedx": seed.x,
                    "--seedy": seed.y,
                    "--cosmosbg": `${Math.floor(seed.x * 734)}px ${Math.floor(seed.y * 1280)}px`,
                } as CSSProperties
            }
        >
            <div className="card__translater">
                <div ref={surface} className="card__rotator rounded-card shadow-lift-lg">
                    <div className="card__front">
                        {children}
                        <div aria-hidden="true" className="card__shine" />
                        <div aria-hidden="true" className="card__glare" />
                    </div>
                </div>
            </div>
        </div>
    );
}
