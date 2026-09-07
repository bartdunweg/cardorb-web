import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The indexable pages only. Public profiles are not listed: whether one is public is the
// collector's setting, and a list of them here would be a directory nobody asked for.
export default function sitemap(): MetadataRoute.Sitemap {
    // The root without its trailing slash, so the sitemap and the page's own canonical name the
    // same URL. Google reconciles the two, but two files we control should not disagree.
    return ["/", "/login", "/signup", "/terms", "/privacy", "/docs/api"].map((path) => ({ url: path === "/" ? siteUrl : `${siteUrl}${path}` }));
}
