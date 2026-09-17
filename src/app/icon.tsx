import { ImageResponse } from "next/og";
import { orbLogoSvg } from "@/lib/orb";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// The favicon: the logo in near-black on a white tile, so it stands on a light tab bar and a dark
// one alike. Drawn from the same code as the logo on the page, so the two never drift. Colours are
// literal: Satori, which renders ImageResponse, reads no CSS variables.
export default function Icon() {
    return new ImageResponse(
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: 7 }}>
            <img src={`data:image/svg+xml;base64,${Buffer.from(orbLogoSvg(30, "#0a0a0a")).toString("base64")}`} width={30} height={30} alt="" />
        </div>,
        size,
    );
}
