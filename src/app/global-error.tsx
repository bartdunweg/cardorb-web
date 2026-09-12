"use client";

import { Button } from "@/components/base/buttons/button";

/**
 * The last net. `error.tsx` catches a failure inside a page, but it renders *inside* the root
 * layout, so a throw in the layout itself (the font, the theme provider, the boot script) falls
 * past it, and what a visitor got was Next's built-in "Application error", in Times New Roman, on
 * a white page, with no way back to the site.
 *
 * This one replaces the whole document, which is why it carries its own <html> and <body>. It
 * cannot use the app's theme (the provider is exactly what may have failed), so it states its
 * own colours rather than reading a token, and keeps to the page ground both themes start from.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, backgroundColor: "#fafafa", color: "#181818", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <main
                    style={{
                        display: "flex",
                        minHeight: "100dvh",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "1rem",
                        padding: "1rem",
                        textAlign: "center",
                    }}
                >
                    <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Cardorb could not start</h1>
                    <p style={{ margin: 0, maxWidth: "34rem", color: "#525252" }}>
                        Something went wrong before the page could be drawn. Your collection is safe: this is the app failing to load, not your cards.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                        <Button color="primary" size="md" onClick={reset}>
                            Try again
                        </Button>
                        <Button color="secondary" size="md" href="/">
                            Go to the home page
                        </Button>
                    </div>
                </main>
            </body>
        </html>
    );
}
