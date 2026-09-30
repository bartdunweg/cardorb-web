import type { OrbGlassMaterial } from "@/lib/orb-glass";
import { cx } from "@/utils/cx";
import { OrbGlass } from "./orb-glass";

type OrbGlassTileProps = {
    /** Width and height in px. */
    size: number;
    material: OrbGlassMaterial;
    className?: string;
    label?: string;
};

const GLOW: Record<OrbGlassMaterial, string> = {
    black: "radial-gradient(closest-side, rgb(90 120 255 / 0.42), rgb(255 110 190 / 0.18) 45%, transparent)",
    violet: "radial-gradient(closest-side, rgb(120 80 255 / 0.75), rgb(110 70 235 / 0.32) 50%, transparent)",
    bubble: "radial-gradient(closest-side, rgb(160 190 255 / 0.4), rgb(255 170 220 / 0.22) 50%, transparent)",
    clear: "radial-gradient(closest-side, rgb(160 190 255 / 0.28), rgb(255 170 220 / 0.14) 50%, transparent)",
};

// The app icon: a white tile, the orb on it, the light the glass throws on the tile beneath it and
// its shadow. White on a dark page too, as an icon is, so its colours are written out here rather
// than taken from the theme. The glass is live (OrbGlass); the tile round it is CSS.
export function OrbGlassTile({ size, material, className, label }: OrbGlassTileProps) {
    const orb = size * 0.62;
    const top = (size - orb) / 2;
    const px = (n: number) => `${(size * n).toFixed(2)}px`;

    return (
        <div
            className={cx("relative shrink-0 overflow-hidden", className)}
            style={{ width: size, height: size, borderRadius: px(0.2237), background: "#fff", boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.08)" }}
            {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        >
            <div
                className="absolute"
                style={{ left: px(0.05), right: px(0.05), top: top + orb * 0.5, height: orb * 0.75, background: GLOW[material], filter: `blur(${px(0.045)})` }}
            />
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
            <OrbGlass size={orb} material={material} surface="light" className="absolute" style={{ left: (size - orb) / 2, top }} />
        </div>
    );
}
