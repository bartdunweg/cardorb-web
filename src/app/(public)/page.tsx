import type { Metadata } from "next";
import { HeroGeometricShapes04 } from "@/components/marketing/header-section/hero-geometric-shapes-04";

// Every public page names its own canonical URL. Only the profile page sets `openGraph` of its
// own: a page-level `openGraph` replaces the root's wholesale, including the file-based image.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// Public landing, prerendered. A signed-in person never sees it: the middleware sends them to the
// dashboard before this renders, so nothing here looks at the session.
export default function LandingPage() {
    return <HeroGeometricShapes04 />;
}
