import Image from "next/image";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbMarkProps = {
    /** The ball's width and height in px. With a shadow, that reaches outside this box, over the page. */
    size: number;
    /** The tile's shadow and glow round the ball. Off in the top bar and the sidebar, where 28 px has no room for them. */
    shadow?: boolean;
    /** The page it sits on; the page's own theme by default. /orb's dark stage is a dark box on a light page, and says so. */
    surface?: "light" | "dark";
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

/** The material the mark is: v20 of the live scene on /orb, the owner's pick (2026-09-30). */
export const ORB_MARK_MATERIAL = "scene20";

/** The ball's share of the scene's box: the shadow and glow are drawn round it, as on the tile. */
const BALL = 0.62;

// The Card Orb mark: v20's soap bubble, live, with no tile round it: the page is what shows through
// the film, and the tile's shadow and glow lie on the page (dying away round the ball, so they have
// no edge). The ball takes the box the size names; the shadow and glow are drawn outside it, over
// the page, so the layout holds. Under the canvas sits a still of the same, one per theme, so the
// server sends a picture, the mark is there before any script runs, and it stays where WebGL is
// missing or motion is reduced; once the canvas draws it covers the still exactly.
export function OrbMark({ size, shadow = true, surface, className, label }: OrbMarkProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    const box = Math.round(size / BALL);
    const offset = -(box - size) / 2;
    const place = { position: "absolute" as const, left: offset, top: offset, width: box, height: box };
    const still = shadow ? "mark" : "mark-plain";
    return (
        <span className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }} {...a11y}>
            {/* Which still shows follows the theme's class (globals.css, .orb-mark-still), not a dark: variant. */}
            <Image
                src={`/orb-mark/${still}-light.png`}
                alt=""
                width={box}
                height={box}
                className="orb-mark-still max-w-none"
                style={place}
                data-theme="light"
                unoptimized
            />
            <Image
                src={`/orb-mark/${still}-dark.png`}
                alt=""
                width={box}
                height={box}
                className="orb-mark-still max-w-none"
                style={place}
                data-theme="dark"
                unoptimized
            />
            <OrbGlass size={box} material={ORB_MARK_MATERIAL} mark shadow={shadow} surface={surface} style={place} />
        </span>
    );
}
