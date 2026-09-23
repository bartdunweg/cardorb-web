import type { MetadataRoute } from "next";
import { getShelf } from "@/lib/sets";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The indexable pages only. Public profiles are not listed: whether one is public is the
// collector's setting, and a list of them here would be a directory nobody asked for.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // The root without its trailing slash, so the sitemap and the page's own canonical name the
    // same URL. Google reconciles the two, but two files we control should not disagree.
    const pages = ["/", "/login", "/signup", "/terms", "/privacy", "/docs/api", "/sets"];
    /*
     * Every set as well, since they opened to readers with no account: a set page is what answers
     * "Base Set card list", where the landing page answers "pokemon collection tracker". Two
     * different searches, and until today only one of them had a page that could be indexed.
     *
     * The catalogue is read without a session, so this is the shared entry every visitor gets. A
     * catalogue that will not answer costs the set pages from this file and not the file itself:
     * a sitemap that fails is a sitemap nobody reads.
     */
    const sets = await getShelf()
        .then((shelf) => shelf.series.flatMap((group) => group.sets.map((set) => `/sets/${encodeURIComponent(set.id)}`)))
        .catch(() => []);
    return [...pages, ...sets].map((path) => ({ url: path === "/" ? siteUrl : `${siteUrl}${path}` }));
}
