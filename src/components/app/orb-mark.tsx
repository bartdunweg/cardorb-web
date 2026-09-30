import Image from "next/image";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbMarkProps = {
    /** Width and height in px, the whole of it: the ball is 62 percent of that, its shadow and glow the rest. */
    size: number;
    /** The page it sits on; the page's own theme by default. */
    surface?: "light" | "dark";
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

/** The material the mark is: v20 of the live scene on /orb, the owner's pick (2026-09-30). */
export const ORB_MARK_MATERIAL = "scene20";

// The Card Orb mark: v20 as it stands on /orb under "Soap bubble, live scene", live, with the
// tile's face left out (it lay over the title, the owner's call): the same bubble, shadow and glow,
// on the page, inside the box the size names, so nothing reaches over what stands next to it.
// Under the canvas sits a still of the same, one per theme, so the server sends a picture and the
// mark is there before any script runs; it stays where WebGL2 is missing. Under reduced motion the
// canvas draws one frame and stands still. The mark keeps moving with no pause control, as the
// landing page's orb did (#626, the owner's call): WCAG 2.2.2 asks for one on motion past five
// seconds; reduced motion is the only way to stop it. Do not add a stop or a button without asking.
export function OrbMark({ size, surface, className, label }: OrbMarkProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    return (
        <span className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }} {...a11y}>
            {/* Which still shows follows the theme's class (globals.css, .orb-mark-still), not a dark: variant. */}
            <Image
                src="/orb-mark/mark-light.png"
                alt=""
                width={512}
                height={512}
                className="orb-mark-still absolute inset-0 size-full"
                data-theme="light"
                unoptimized
            />
            <Image
                src="/orb-mark/mark-dark.png"
                alt=""
                width={512}
                height={512}
                className="orb-mark-still absolute inset-0 size-full"
                data-theme="dark"
                unoptimized
            />
            <OrbGlass size={size} material={ORB_MARK_MATERIAL} mark surface={surface} className="absolute inset-0" />
        </span>
    );
}
