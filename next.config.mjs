/** @type {import('next').NextConfig} */
const nextConfig = {
    // Card pictures go through the image optimizer (src/components/app/card-image.tsx). These are
    // the hosts the Card Orb API hands out pictures from; the component keeps the same list.
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "assets.tcgdex.net" },
            { protocol: "https", hostname: "images.pokemontcg.io" },
            { protocol: "https", hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com" },
            { protocol: "https", hostname: "api.cardorb.com" },
        ],
    },
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    // Headers a browser honours without any script change. No script-src: Next's inline
    // bootstrap scripts need a nonce for that, which is its own piece of work; frame-ancestors
    // alone already stops the site being framed.
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
