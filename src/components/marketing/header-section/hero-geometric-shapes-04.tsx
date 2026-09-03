"use client";

import Link from "next/link";
import { Button } from "@/components/base/buttons/button";

// Public landing hero for Cardorb. Based on Untitled UI's hero-geometric-shapes-04, with the
// heavy marketing Header/nav removed and copy + CTAs pointed at our auth routes.
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

            {/* Minimal top bar */}
            <header className="relative z-10 mx-auto flex w-full max-w-container items-center justify-between px-4 py-5 md:px-8">
                <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                    Cardorb
                </Link>
            </header>

            <main className="relative flex flex-1 items-center py-16">
                <div className="mx-auto w-full max-w-container px-4 md:px-8">
                    <div className="mx-auto flex max-w-5xl flex-col md:items-center md:text-center">
                        <h1 className="mt-4 text-display-md font-medium text-primary md:text-display-lg lg:text-display-xl">
                            Organize your trading card collection
                        </h1>
                        <p className="mt-4 max-w-120 text-lg text-balance text-tertiary md:mt-6 md:text-xl">
                            Browse, organize, and manage every card in one place.
                        </p>
                        <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start md:mt-12">
                            <Button href="/login" color="secondary" size="xl">
                                Sign in
                            </Button>
                            <Button href="/signup" size="xl">
                                Get started
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
