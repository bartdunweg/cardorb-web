import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BOOT_SCRIPT } from "@/lib/theme-script";
import { ThemeProvider } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
    "Keep track of your Pokémon card collection: the cards you own, sorted into binders, a wishlist, a Pokédex of what you hold, and a public page to show it.";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "Cardorb",
        template: "%s · Cardorb",
    },
    description,
    openGraph: {
        title: "Cardorb",
        description,
        siteName: "Cardorb",
        type: "website",
    },
    twitter: { card: "summary_large_image" },
    // A preview deploy is not the site; keep it out of the index.
    robots: process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
    // The page ground (theme.css --color-bg-page), so Safari's bars and the overscroll match the
    // page: neutral 50 in the light theme, the dark ground halfway between 950 and 900.
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafafa" },
        { media: "(prefers-color-scheme: dark)", color: "#101010" },
    ],
    colorScheme: "light dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Sets the theme class before first paint. A Server Component emits it once, in place;
                    the CSP names its hash, so it needs no nonce and the static pages stay static. */}
                <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
            </head>
            <body className={cx(inter.variable, "bg-page antialiased")}>
                {/* No RouteProvider here: the public pages are static text with plain links, and the
                    provider's react-aria dependency belongs to the signed-in and auth layouts. */}
                <ThemeProvider>{children}</ThemeProvider>
                {/* How long a page takes on the devices it is actually read on, per route: LCP for
                    what is drawn and INP for how fast a tap is answered. Everything we know about
                    the app's speed until now was measured on one Mac on one connection, which
                    says nothing about a phone on 4G, and "it feels slow" deserves a number.
                    Same origin (the script and the beacon are both /_vercel/…), so the nonce
                    policy in lib/csp.ts needs nothing added, and the proxy skips the path. */}
                <SpeedInsights />
            </body>
        </html>
    );
}
