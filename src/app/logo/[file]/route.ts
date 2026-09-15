import { ORB_LOGO_SIZES, orbLogoSvg } from "@/lib/orb";

// The logo as a file, one per drawn size (/logo/28.svg), built once at build time and cached by the
// browser. The page shows it as a mask in the text colour (OrbLogo), so light and dark need one
// file, and a thousand dots are not written into every page's HTML and its React payload.
export const dynamicParams = false;

export function generateStaticParams() {
    return ORB_LOGO_SIZES.map((size) => ({ file: `${size}.svg` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
    const { file } = await params;
    const size = ORB_LOGO_SIZES.find((drawn) => file === `${drawn}.svg`);
    if (!size) return new Response("Not found", { status: 404 });

    return new Response(orbLogoSvg(size, "#000"), {
        headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=31536000, immutable" },
    });
}
