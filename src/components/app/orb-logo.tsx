import { orbLogoSizeFor } from "@/lib/orb";
import { cx } from "@/utils/cx";

type OrbLogoProps = {
    /** Width and height in px. The file drawn for the nearest size at or above it is used. */
    size: number;
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

// The Card Orb logo: the landing page's orb at rest, round and weighted to hold up small (orbLogo in
// src/lib/orb.ts). Painted in the text colour through a mask of /logo/<size>.svg, so one cached file
// serves light and dark, and the page carries a span instead of a thousand dots. The favicon and the
// app icon draw the same SVG through orbLogoSvg.
export function OrbLogo({ size, className, label }: OrbLogoProps) {
    const mask = `url(/logo/${orbLogoSizeFor(size)}.svg) center / contain no-repeat`;

    return (
        <span
            className={cx("inline-block shrink-0 bg-current", className)}
            style={{ width: size, height: size, mask, WebkitMask: mask }}
            {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        />
    );
}
