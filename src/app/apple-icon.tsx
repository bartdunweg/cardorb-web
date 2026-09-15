import { ImageResponse } from "next/og";
import { orbLogoSvg } from "@/lib/orb";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The home-screen icon: the logo on a white square, the owner's pick over black. Square, because
// the phone rounds the corners itself. Colours are literal: Satori reads no CSS variables.
export default function AppleIcon() {
    return new ImageResponse(
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws an img, not next/image */}
            <img src={`data:image/svg+xml;base64,${Buffer.from(orbLogoSvg(150, "#0a0a0a")).toString("base64")}`} width={150} height={150} alt="" />
        </div>,
        size,
    );
}
