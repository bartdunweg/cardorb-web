/** @type {import('next').NextConfig} */
const nextConfig = {
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
