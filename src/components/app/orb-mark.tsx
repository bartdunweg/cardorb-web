import Image from "next/image";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbMarkProps = {
    /** The ball's width and height in px. The shadow and glow round it reach outside this box, over the page. */
    size: number;
    /** The page it sits on; the page's own theme by default. /orb's dark stage is a dark box on a light page, and says so. */
    surface?: "light" | "dark";
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

/** The material the mark is: v20 of the live scene on /orb, the owner's pick (2026-09-30). */
export const ORB_MARK_MATERIAL = "scene20";

/** The ball's share of the tile's box; the shadow and glow are drawn round it, as on the tile. */
const BALL = 0.62;

// The Card Orb mark: v20, the app icon, live, with the page for a face and no edge round it: the
// same bubble, shadow and glow, the owner's call. The ball takes the box the size names; the
// shadow and glow are drawn outside it, over the page, so the layout holds. Under the canvas sits
// a still of the same, one per theme, so the server sends a picture and the mark is there before
// any script runs; it stays where WebGL2 is missing. Under reduced motion the canvas draws one
// frame and stands still. The mark keeps moving with no pause control, as the landing page's orb
// did (#626, the owner's call): WCAG 2.2.2 asks for one on motion past five seconds; reduced
// motion is the only way to stop it. Do not add a stop or a button without asking.
export function OrbMark({ size, surface, className, label }: OrbMarkProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    const box = Math.round(size / BALL);
    const offset = -(box - size) / 2;
    const place = { position: "absolute" as const, left: offset, top: offset, width: box, height: box };
    return (
        <span className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }} {...a11y}>
            {/* Which still shows follows the theme's class (globals.css, .orb-mark-still), not a dark: variant. */}
            <Image
                src="/orb-mark/mark-light.png"
                alt=""
                width={512}
                height={512}
                className="orb-mark-still max-w-none"
                style={place}
                data-theme="light"
                unoptimized
            />
            <Image
                src="/orb-mark/mark-dark.png"
                alt=""
                width={512}
                height={512}
                className="orb-mark-still max-w-none"
                style={place}
                data-theme="dark"
                unoptimized
            />
            <OrbGlass size={box} material={ORB_MARK_MATERIAL} mark surface={surface} style={place} />
        </span>
    );
}
