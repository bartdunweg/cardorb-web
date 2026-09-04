"use client";

import { PublicTopBar } from "@/components/app/public-top-bar";
import { Button } from "@/components/base/buttons/button";

// Public landing hero for Cardorb. Based on Untitled UI's hero-geometric-shapes-04, with the
// heavy marketing Header/nav replaced by the shared PublicTopBar; the hero carries one call to
// action, Get started, so it never competes with the bar's pair.
export const HeroGeometricShapes04 = () => {
    return (
        <div className="relative flex min-h-dvh flex-col overflow-hidden bg-primary">
            {/* Background dot grid */}
            <img
                alt="Grid of dots"
                aria-hidden="true"
                loading="lazy"
                src="https://www.untitledui.com/patterns/light/grid-dot-sm-desktop.svg"
                className="pointer-events-none absolute top-0 left-1/2 z-0 hidden max-w-none -translate-x-1/2 md:block dark:brightness-[0.2]"
            />
            <img
                alt="Grid of dots"
                aria-hidden="true"
                loading="lazy"
                src="https://www.untitledui.com/patterns/light/grid-dot-sm-mobile.svg"
                className="pointer-events-none absolute top-0 left-1/2 z-0 max-w-none -translate-x-1/2 md:hidden dark:brightness-[0.2]"
            />

            <PublicTopBar />

            <main className="relative flex flex-1 items-center py-16">
                <div className="mx-auto w-full max-w-container px-4 md:px-8">
                    <div className="mx-auto flex max-w-5xl flex-col md:items-center md:text-center">
                        <h1 className="mt-4 text-display-md font-medium text-primary md:text-display-lg lg:text-display-xl">
                            Organize your trading card collection
                        </h1>
                        <p className="mt-4 max-w-120 text-lg text-balance text-tertiary md:mt-6 md:text-xl">
                            Browse, organize, and manage every card in one place.
                        </p>
                        <div className="mt-8 flex w-full flex-col items-stretch sm:w-auto md:mt-12">
                            <Button href="/signup" size="xl" className="rounded-full before:rounded-full">
                                Get started
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* One-row footer: the legal pages and who runs the site. The API reference is not linked
                here: the API serves only our own apps, and a visitor cannot get a key. */}
            <footer className="relative z-10 mx-auto flex w-full max-w-container flex-col-reverse items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between md:px-8">
                <p className="text-sm text-quaternary">© {new Date().getFullYear()} BADU Ventures B.V.</p>
                <nav aria-label="Footer">
                    <ul className="flex items-center gap-6">
                        {[
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
            </footer>
        </div>
    );
};
