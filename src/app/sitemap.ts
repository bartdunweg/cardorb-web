import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The indexable pages only. Public profiles are not listed: whether one is public is the
// collector's setting, and a list of them here would be a directory nobody asked for.
export default function sitemap(): MetadataRoute.Sitemap {
    return ["/", "/login", "/signup", "/terms", "/privacy", "/docs/api"].map((path) => ({ url: `${siteUrl}${path}` }));
}
