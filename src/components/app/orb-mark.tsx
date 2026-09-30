import Image from "next/image";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbMarkProps = {
    /** Width and height in px. */
    size: number;
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

/** The material the mark is: v20 of the live scene on /orb, the owner's pick (2026-09-30). */
export const ORB_MARK_MATERIAL = "scene20";

// The Card Orb mark: the app icon itself, live. The soap bubble on its tile, white by day and
// near-black by night (the scene reads the theme as it draws), with a hairline round it as the
// icons on /orb have (globals.css, .orb-mark-ring). Under the canvas sits a still of the same
// tile, one per theme, so the server sends a picture, the mark is there before any script runs,
// and it stays where WebGL is missing or motion is reduced; once the canvas draws it covers the
// still exactly.
export function OrbMark({ size, className, label }: OrbMarkProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    const radius = size * 0.2237;
    return (
        <span className={cx("relative inline-block shrink-0 overflow-hidden", className)} style={{ width: size, height: size, borderRadius: radius }} {...a11y}>
            {/* Which still shows follows the theme's class (globals.css, .orb-mark-still), not a dark: variant. */}
            <Image
                src="/orb-mark/tile-light.png"
                alt=""
                width={size}
                height={size}
                className="orb-mark-still absolute inset-0"
                data-theme="light"
                unoptimized
            />
            <Image src="/orb-mark/tile-dark.png" alt="" width={size} height={size} className="orb-mark-still absolute inset-0" data-theme="dark" unoptimized />
            <OrbGlass size={size} material={ORB_MARK_MATERIAL} className="absolute inset-0" />
            <span className="orb-mark-ring pointer-events-none absolute inset-0" style={{ borderRadius: radius }} />
        </span>
    );
}
