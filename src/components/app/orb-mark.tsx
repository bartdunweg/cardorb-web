import Image from "next/image";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbMarkProps = {
    /** The ball's width and height in px. The tile round it, white by day and near-black by night, reaches outside this box. */
    size: number;
    /** The page it sits on; the page's own theme by default. */
    surface?: "light" | "dark";
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

/** The material the mark is: v20 of the live scene on /orb, the owner's pick (2026-09-30). */
export const ORB_MARK_MATERIAL = "scene20";

/** The ball's share of the tile: the size named is the ball, the tile is drawn round it. */
const BALL = 0.62;

// The Card Orb mark: v20 as it stands on /orb under "Soap bubble, live scene", the tile itself,
// live, without the hairline round it, and larger: the size named is the ball, and the tile with
// its shadow and glow is drawn round it, outside the box, so the layout holds. On a light page the
// white face is invisible and only the bubble, its shadow and its glow are seen. Under the canvas
// sits a still of the same tile, one per theme, so the server sends a picture and the mark is
// there before any script runs; it stays where WebGL2 is missing. Under reduced motion the canvas
// draws one frame and stands still. The mark keeps moving with no pause control, as the landing
// page's orb did (#626, the owner's call): WCAG 2.2.2 asks for one on motion past five seconds;
// reduced motion is the only way to stop it. Do not add a stop or a button without asking.
export function OrbMark({ size, surface, className, label }: OrbMarkProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    const box = Math.round(size / BALL);
    const offset = -(box - size) / 2;
    const place = { position: "absolute" as const, left: offset, top: offset, width: box, height: box, borderRadius: box * 0.2237 };
    return (
        <span className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }} {...a11y}>
            {/* Which still shows follows the theme's class (globals.css, .orb-mark-still), not a dark: variant. */}
            <Image
                src="/orb-mark/tile-light.png"
                alt=""
                width={1024}
                height={1024}
                className="orb-mark-still max-w-none"
                style={place}
                data-theme="light"
                unoptimized
            />
            <Image
                src="/orb-mark/tile-dark.png"
                alt=""
                width={1024}
                height={1024}
                className="orb-mark-still max-w-none"
                style={place}
                data-theme="dark"
                unoptimized
            />
            <OrbGlass size={box} material={ORB_MARK_MATERIAL} surface={surface} style={place} />
        </span>
    );
}
