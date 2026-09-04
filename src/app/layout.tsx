import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BOOT_SCRIPT } from "@/lib/theme-script";
import { RouteProvider } from "@/providers/router-provider";
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
    "Keep track of your Pokémon card collection: the cards you own, sorted into collections, a wishlist, a Pokédex of what you hold, and a public page to show it.";

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
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <RouteProvider>
                    <ThemeProvider>{children}</ThemeProvider>
                </RouteProvider>
            </body>
        </html>
    );
}
