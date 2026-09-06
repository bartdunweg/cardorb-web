/** @type {import('next').NextConfig} */
const nextConfig = {
    // Card pictures go through the image optimizer (src/components/app/card-image.tsx). These are
    // the hosts the Card Orb API hands out pictures from; the component keeps the same list.
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "assets.tcgdex.net" },
            { protocol: "https", hostname: "images.pokemontcg.io" },
            { protocol: "https", hostname: "images.scrydex.com" },
            { protocol: "https", hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com" },
            { protocol: "https", hostname: "api.cardorb.com" },
            // Avatars live in Supabase storage, which serves them as uploaded (a 90 KB PNG for a
            // 56 px circle) with no-cache. Through the optimizer they are resized and cached.
            { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/avatars/**" },
        ],
        // AVIF first: a third smaller than WebP for a card scan, and every current browser reads it.
        formats: ["image/avif", "image/webp"],
        // Next 16 allows only the qualities listed here. 60 for card thumbnails, where a scan of
        // a scan gains nothing above it; 75 stays the default.
        qualities: [60, 75],
        // The widths a srcset may name. The default list runs to 3840 px, and a grid of a hundred
        // tiles wrote fifteen candidates each: 300 KB of HTML on a public profile. No picture here
        // draws wider than a 213 px tile, so 1080 px covers a 3x screen with room to spare.
        deviceSizes: [640, 750, 828, 1080],
        imageSizes: [64, 96, 128, 256, 384],
    },
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
        // The router keeps a page it has shown for a minute: a tab tapped twice, or Back, is drawn
        // from memory rather than fetched again. A write calls router.refresh(), which bypasses it.
        staleTimes: { dynamic: 60, static: 300 },
    },
    // Headers a browser honours without any script change. The Content-Security-Policy is not
    // here: src/proxy.ts sets it per request (a nonce policy on the signed-in and auth pages,
    // frame-ancestors alone elsewhere). In development a header set here replaces the
    // middleware's, which hid the nonce policy from every local check. X-Frame-Options says the
    // same as frame-ancestors, and is here because the proxy's matcher skips images, /api and the
    // 404 page served for them, which a CSP set only by the proxy left frameable.
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                ],
            },
        ];
    },
    async redirects() {
        return [
            {
                source: "/:path*",
                has: [{ type: "host", value: "www.cardorb.com" }],
                destination: "https://cardorb.com/:path*",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
