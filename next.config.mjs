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
