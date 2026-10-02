import Image from "next/image";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbMarkProps = {
    /** Width and height in px, the whole of it: the ball is 62 percent of that, its shadow the rest. */
    size: number;
    /** The page it sits on; the page's own theme by default. */
    surface?: "light" | "dark";
    /** The tile's shadow round the ball (v26 has no glow, and on dark nothing round it); off for the logo in the top bar and the sidebar (the owner's call). */
    shadow?: boolean;
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

/** The material the mark is: v26 of the live scene on /orb, the owner's pick (2026-10-02; v20 before it). */
export const ORB_MARK_MATERIAL = "scene26";

// The Card Orb mark: v26 as it stands on /orb under "Soap bubble, live scene", live, with the
// tile's face left out (it lay over the title, the owner's call): the same bubble and its shadow,
// on the page, inside the box the size names, so nothing reaches over what stands next to it.
// Under the canvas sits a still of the same, one per theme, so the server sends a picture and the
// mark is there before any script runs; it stays where WebGL2 is missing. Under reduced motion the
// canvas draws one frame and stands still. The mark keeps moving with no pause control, as the
// landing page's orb did (#626, the owner's call): WCAG 2.2.2 asks for one on motion past five
// seconds; reduced motion is the only way to stop it. Do not add a stop or a button without asking.
export function OrbMark({ size, surface, shadow = true, className, label }: OrbMarkProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    // The stills are drawn at the scene's first moment, so the canvas's first frame is the still to the pixel.
    const still = shadow ? "mark" : "mark-plain";
    return (
        <span className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }} {...a11y}>
            {/* Which still shows follows the theme's class (globals.css, .orb-mark-still), not a dark: variant. */}
            <Image
                src={`/orb-mark/${still}-light.png`}
                alt=""
                width={512}
                height={512}
                className="orb-mark-still absolute inset-0 size-full"
                data-theme="light"
                unoptimized
            />
            <Image
                src={`/orb-mark/${still}-dark.png`}
                alt=""
                width={512}
                height={512}
                className="orb-mark-still absolute inset-0 size-full"
                data-theme="dark"
                unoptimized
            />
            <OrbGlass size={size} material={ORB_MARK_MATERIAL} mark shadow={shadow} surface={surface} className="absolute inset-0" />
        </span>
    );
}
