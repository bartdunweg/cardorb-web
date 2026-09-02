import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The shell both legal documents render into: /privacy and /terms.
 *
 * Long-form text sets itself with the kit's `.prose` styles (src/styles/typography.css), so the
 * pages only write the content. The width is capped well below the app's container: nobody reads
 * a legal document set across a full desktop.
 */
export function LegalPage({
    title,
    updated,
    children,
}: {
    title: string;
    /** One value, two readers: the visible line and <time dateTime>, so they cannot disagree. */
    updated: { iso: string; human: string };
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-primary">
            <header className="mx-auto flex max-w-container items-center px-4 py-5 md:px-8">
                <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                    Cardorb
                </Link>
            </header>
            <main id="main-content" className="mx-auto max-w-3xl px-4 pt-8 pb-24 md:px-8 md:pt-16">
                <article className="prose">
                    <h1>{title}</h1>
                    <p className="text-sm text-tertiary">
                        Last updated <time dateTime={updated.iso}>{updated.human}</time>
                    </p>
                    {children}
                </article>
            </main>
        </div>
    );
}
