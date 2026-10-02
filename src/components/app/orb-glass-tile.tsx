import Image from "next/image";
import { type OrbGlassFamily, type OrbGlassMaterial, orbGlassFamily, orbGlassIsScene } from "@/lib/orb-glass";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbGlassTileProps = {
    /** Width and height in px. */
    size: number;
    material: OrbGlassMaterial;
    /** A picture of the orb instead of the live glass: the study's render. Sized to the orb, transparent round it. */
    still?: string;
    /** A picture of the whole tile, exact: the study's own render of face, shadow and orb. Nothing else is drawn. */
    whole?: string;
    /** The dark app icon: a near-black face, and a bubble on it lets that face through. */
    dark?: boolean;
    /** Without it, the tile is the face and the orb alone: no glow under the glass, no shadow. */
    shadow?: boolean;
    className?: string;
    label?: string;
};

const GLOW: Record<OrbGlassFamily, string> = {
    bubble: "radial-gradient(closest-side, rgb(160 190 255 / 0.4), rgb(255 170 220 / 0.22) 50%, transparent)",
    soap: "radial-gradient(closest-side, rgb(160 190 255 / 0.28), rgb(255 170 220 / 0.14) 50%, transparent)",
    // A scene draws its own glow; this is never used.
    scene: "none",
};

// The app icon's box, without the face: what stands on /orb is what the logo is (the owner's call,
// 2026-09-30), so no tile, no hairline. A scene material draws itself as the mark does, with the
// page for a face; the bare balls keep the glow the glass throws and the shadow, written out here
// rather than taken from the theme (R-STYLE-001, deliberately: they are the colours the glass
// throws, not the app's). The glass is live (OrbGlass) or the study's picture.
export function OrbGlassTile({ size, material, still, whole, dark = false, shadow = true, className, label }: OrbGlassTileProps) {
    const orb = size * 0.62;
    const top = (size - orb) / 2;
    const px = (n: number) => `${(size * n).toFixed(2)}px`;

    // A scene material draws itself as the mark does: the ball and what it throws on the page (a shadow, and a glow before v26).
    if (orbGlassIsScene(material)) {
        return (
            <div
                className={cx("relative shrink-0", className)}
                style={{ width: size, height: size }}
                {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
            >
                <OrbGlass size={size} material={material} surface={dark ? "dark" : "light"} mark />
            </div>
        );
    }

    // The picture is the tile; the hairline round it is the same as the live tile's, so the two sit alike.
    if (whole) {
        return (
            <div
                className={cx("relative shrink-0 overflow-hidden", className)}
                style={{ width: size, height: size, borderRadius: px(0.2237) }}
                {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
            >
                <Image src={whole} alt="" width={size} height={size} unoptimized />
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ borderRadius: px(0.2237), boxShadow: dark ? "inset 0 0 0 1px rgb(255 255 255 / 0.1)" : "inset 0 0 0 1px rgb(0 0 0 / 0.08)" }}
                />
            </div>
        );
    }

    return (
        <div
            className={cx("relative shrink-0", className)}
            style={{ width: size, height: size }}
            {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        >
            {shadow && (
                <div
                    className="absolute"
                    style={{
                        left: px(0.05),
                        right: px(0.05),
                        top: top + orb * 0.5,
                        height: orb * 0.75,
                        background: GLOW[orbGlassFamily(material)],
                        opacity: dark ? 0.7 : 1,
                        filter: `blur(${px(0.045)})`,
                    }}
                />
            )}
            {shadow && !dark && (
                <div
                    className="absolute rounded-full"
                    style={{
                        left: size / 2 - orb * 0.42,
                        top: top + orb * 0.8,
                        width: orb * 0.84,
                        height: orb * 0.28,
                        background: "rgb(10 10 20 / 0.32)",
                        filter: `blur(${px(0.03)})`,
                    }}
                />
            )}
            {still ? (
                <Image src={still} alt="" width={orb} height={orb} className="absolute" style={{ left: (size - orb) / 2, top }} unoptimized />
            ) : (
                <OrbGlass size={orb} material={material} surface={dark ? "dark" : "light"} className="absolute" style={{ left: (size - orb) / 2, top }} />
            )}
        </div>
    );
}
