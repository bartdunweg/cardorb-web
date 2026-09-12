import type { Metadata } from "next";
import { HeroGeometricShapes04 } from "@/components/marketing/header-section/hero-geometric-shapes-04";

// Every public page names its own canonical URL. Only the profile page sets `openGraph` of its
// own: a page-level `openGraph` replaces the root's wholesale, including the file-based image.
// A title of its own, because the root template only supplies a fallback and this page was
// shipping "Cardorb", seven characters, on the one page that has to earn a click from a
// search result. The words are the ones the description already uses.
export const metadata: Metadata = { title: "Keep track of your Pokémon card collection", alternates: { canonical: "/" } };

// Public landing, prerendered. A signed-in person never sees it: the middleware sends them to the
// dashboard before this renders, so nothing here looks at the session.
export default function LandingPage() {
    return <HeroGeometricShapes04 />;
}
