import { ImageResponse } from "next/og";

export const alt = "Cardorb: organize your trading card collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card: the name and the hero's one line, large enough to read in a chat preview.
// Colours are literal hex, not theme tokens: ImageResponse renders through Satori, which reads no
// CSS variables, and the picture is one static PNG with no light or dark side.
export default function OpenGraphImage() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: 96,
                background: "#0a0a0a",
                color: "#fafafa",
                fontFamily: "sans-serif",
            }}
        >
            <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>Cardorb</div>
            <div style={{ marginTop: 32, fontSize: 84, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3 }}>Organize your trading card collection</div>
            <div style={{ marginTop: 32, fontSize: 36, color: "#a3a3a3" }}>Browse, organize, and manage every card in one place.</div>
        </div>,
        size,
    );
}
