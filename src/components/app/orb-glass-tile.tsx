import Image from "next/image";
import { type OrbGlassFamily, type OrbGlassMaterial, orbGlassFamily } from "@/lib/orb-glass";
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
    black: "radial-gradient(closest-side, rgb(90 120 255 / 0.42), rgb(255 110 190 / 0.18) 45%, transparent)",
    violet: "radial-gradient(closest-side, rgb(120 80 255 / 0.75), rgb(110 70 235 / 0.32) 50%, transparent)",
    bubble: "radial-gradient(closest-side, rgb(160 190 255 / 0.4), rgb(255 170 220 / 0.22) 50%, transparent)",
    soap: "radial-gradient(closest-side, rgb(160 190 255 / 0.28), rgb(255 170 220 / 0.14) 50%, transparent)",
};

// The app icon: a tile, the orb on it, the light the glass throws on the tile beneath it and its
// shadow. Light or dark by its own prop, as iOS keeps a light and a dark icon, never by the page:
// its face is the theme's white or its darkest neutral, and the glow and shadow are written out
// here rather than taken from the theme (R-STYLE-001, deliberately: they are the colours the glass
// throws, not the app's). The glass is live (OrbGlass) or the study's picture; the tile round it is CSS.
export function OrbGlassTile({ size, material, still, whole, dark = false, shadow = true, className, label }: OrbGlassTileProps) {
    const orb = size * 0.62;
    const top = (size - orb) / 2;
    const px = (n: number) => `${(size * n).toFixed(2)}px`;

    if (whole) {
        return (
            <Image
                src={whole}
                alt={label ?? ""}
                width={size}
                height={size}
                className={cx("shrink-0", className)}
                style={{ borderRadius: px(0.2237) }}
                unoptimized
            />
        );
    }

    return (
        <div
            className={cx("relative shrink-0 overflow-hidden", className)}
            style={{
                width: size,
                height: size,
                borderRadius: px(0.2237),
                background: dark ? "var(--color-neutral-900)" : "var(--color-white)",
                boxShadow: dark ? "inset 0 0 0 1px rgb(255 255 255 / 0.1)" : "inset 0 0 0 1px rgb(0 0 0 / 0.08)",
            }}
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
