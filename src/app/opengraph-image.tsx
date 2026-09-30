import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Cardorb: organize your trading card collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card: the logo and name, and the hero's one line, large enough to read in a chat preview.
// Colours are literal hex, not theme tokens: ImageResponse renders through Satori, which reads no
// CSS variables, and the picture is one static PNG with no light or dark side.
export default async function OpenGraphImage() {
    // The mark as the dark page draws it, a file, since Satori runs no WebGL.
    const mark = await readFile(join(process.cwd(), "public", "orb-mark", "mark-dark.png"));
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
            <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>
                <img src={`data:image/png;base64,${mark.toString("base64")}`} width={64} height={64} alt="" />
                Cardorb
            </div>
            <div style={{ marginTop: 32, fontSize: 84, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3 }}>Organize your trading card collection</div>
            <div style={{ marginTop: 32, fontSize: 36, color: "#a3a3a3" }}>Browse, organize, and manage every card in one place.</div>
        </div>,
        size,
    );
}
