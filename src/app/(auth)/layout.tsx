// The auth pages draw their own full-screen layout. This one only pins them to per-request
// rendering: the middleware sets a nonce policy on these paths, and Next signs its own scripts
// with that nonce only when it renders the page for the request, never in a prerender.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return children;
}
