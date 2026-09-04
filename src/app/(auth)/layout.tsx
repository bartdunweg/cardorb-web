import { RouteProvider } from "@/providers/router-provider";

// The auth pages draw their own full-screen layout. This one pins them to per-request rendering:
// the middleware sets a nonce policy on these paths, and Next signs its own scripts with that
// nonce only when it renders the page for the request, never in a prerender. And it gives the
// kit's links the app router, which the public pages do without.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <RouteProvider>{children}</RouteProvider>;
}
