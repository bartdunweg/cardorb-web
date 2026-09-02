import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/base/buttons/button";
import { SectionDivider } from "@/components/shared-assets/section-divider";

/**
 * The shell both legal documents render into: /privacy and /terms.
 *
 * Untitled UI's legal-pages/01 template (centred header with the date, a rich-text column,
 * a section divider, a footer) with the landing page's minimal top bar instead of the marketing
 * header, and a footer without the newsletter form the site does not have.
 */
export function LegalPage({
    title,
    intro,
    updated,
    children,
}: {
    title: string;
    /** One sentence under the title, in the header. */
    intro: string;
    /** One value, two readers: the visible line and <time dateTime>, so they cannot disagree. */
    updated: { iso: string; human: string };
    children: ReactNode;
}) {
    return (
        <div className="bg-primary">
            <header className="mx-auto flex w-full max-w-container items-center justify-between px-4 py-5 md:px-8">
                <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                    Cardorb
                </Link>
            </header>

            <main id="main-content">
                <section className="bg-primary py-16 md:py-24">
                    <div className="mx-auto max-w-container px-4 md:px-8">
                        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                            <span className="text-sm font-semibold text-brand-secondary md:text-md">
                                Current as of <time dateTime={updated.iso}>{updated.human}</time>
                            </span>
                            <h1 className="mt-3 text-display-md font-semibold text-primary md:text-display-lg">{title}</h1>
                            <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">{intro}</p>
                        </div>
                    </div>
                </section>

                <section className="bg-primary pb-16 md:pb-24">
                    <div className="mx-auto max-w-container px-4 md:px-8">
                        <div className="mx-auto prose md:prose-lg md:max-w-180">{children}</div>
                    </div>
                </section>
            </main>

            <SectionDivider />

            <footer className="bg-primary py-12 md:py-16">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="flex flex-col gap-8 md:items-center">
                        <span className="text-lg font-semibold text-primary">Cardorb</span>
                        <nav aria-label="Footer">
                            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-[repeat(3,max-content)]">
                                {[
                                    { title: "Home", href: "/" },
                                    { title: "Privacy", href: "/privacy" },
                                    { title: "Terms", href: "/terms" },
                                ].map((item) => (
                                    <li key={item.title}>
                                        <Button color="link-gray" size="md" href={item.href} className="max-h-5">
                                            {item.title}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                    <div className="relative mt-12 flex flex-col justify-between gap-8 pt-8 md:mt-16 md:flex-row md:items-center">
                        <div className="absolute top-0 left-0 h-px w-full bg-border-secondary"></div>
                        <p className="text-sm text-quaternary">© {new Date().getFullYear()} BADU Ventures B.V. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
