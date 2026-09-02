import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// What is behind a login or is an API is not worth crawling. Keeping a page out of the index is
// done with `noindex` on the page itself, not here.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/auth/", "/api/"] },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
