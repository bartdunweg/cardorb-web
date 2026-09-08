import { RouteProvider } from "@/providers/router-provider";

// The auth pages fill the window: no sidebar, no bar, one column in the middle. This one pins them
// to per-request rendering: the middleware sets a nonce policy on these paths, and Next signs its
// own scripts with that nonce only when it renders the page for the request, never in a prerender.
// And it gives the kit's links the app router, which the public pages do without.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <RouteProvider>
            {/* The landmark is the layout's, not the form's: AuthShell is drawn on the design page too,
                and a second <main> inside the app's own would be two of a thing there may be one of. */}
            <main className="flex min-h-dvh flex-col bg-primary">{children}</main>
        </RouteProvider>
    );
}
