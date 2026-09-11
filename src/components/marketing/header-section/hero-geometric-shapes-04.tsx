import { LandingPreview } from "@/components/app/landing-preview";
import { LinkButton } from "@/components/app/link-button";
import { PublicTopBar } from "@/components/app/public-top-bar";

// Public landing hero for Cardorb. Based on Untitled UI's hero-geometric-shapes-04, with the
// heavy marketing Header/nav replaced by the shared PublicTopBar and its buttons by plain links, so
// the page ships no react-aria; the hero carries one call to
// action, Get started, so it never competes with the bar's pair.
//
// The copy stands left and the product beside it, as Origin, Oku and Monarch set a tracking
// product's hero: five columns of words, seven of picture from md up, four and eight from xl,
// where the picture's four tiles stand in a row; on a phone the words first and the picture
// under them, full width. The picture is Home drawn from the app's own parts (LandingPreview),
// not a screenshot, so it never goes stale.
export const HeroGeometricShapes04 = () => {
    return (
        <div className="relative flex min-h-dvh flex-col overflow-hidden bg-primary">
            {/* Background dot grid. The kit's own copy of the pattern, served from /public rather than
                fetched from untitledui.com: the pages you click here from (sign out, the logo on
                /login) carry a script-and-image policy that names the card hosts and not that one,
                and a click keeps the document, so the browser refused the picture without a word
                until a refresh. 'self' covers a file of ours on every page. */}
            <img
                alt="Grid of dots"
                aria-hidden="true"
                loading="lazy"
                src="/patterns/grid-dot-sm-desktop.svg"
                className="pointer-events-none absolute top-0 left-1/2 z-0 hidden max-w-none -translate-x-1/2 md:block dark:brightness-[0.2]"
            />
            <img
                alt="Grid of dots"
                aria-hidden="true"
                loading="lazy"
                src="/patterns/grid-dot-sm-mobile.svg"
                className="pointer-events-none absolute top-0 left-1/2 z-0 max-w-none -translate-x-1/2 md:hidden dark:brightness-[0.2]"
            />

            <PublicTopBar />

            {/* The words first, centered, then the product under them at full width: the dashboard
                is what the page is selling, and it sits half under the fold on a laptop so the eye
                is drawn down into it. The owner's call over the side-by-side layout. */}
            <main className="relative flex flex-1 flex-col pt-16 pb-8 md:pt-24 md:pb-12">
                <div className="mx-auto flex w-full max-w-container flex-col items-center px-4 md:px-8">
                    <div className="flex w-full max-w-3xl flex-col items-center text-center">
                        <h1 className="mt-4 text-display-md font-medium text-balance text-primary md:text-display-lg lg:text-display-xl">
                            Organize your trading card collection
                        </h1>
                        <p className="mt-4 max-w-120 text-lg text-balance text-tertiary md:mt-6 md:text-xl">
                            Browse, organize, and manage every card in one place.
                        </p>
                        <div className="mt-8 flex w-full flex-col items-stretch sm:w-auto md:mt-12">
                            <LinkButton href="/signup" size="xl">
                                Get started
                            </LinkButton>
                        </div>
                    </div>
                    <LandingPreview className="mt-12 w-full max-w-5xl md:mt-16" />
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
                                <LinkButton color="link-gray" size="md" href={item.href} className="min-h-6">
                                    {item.title}
                                </LinkButton>
                            </li>
                        ))}
                    </ul>
                </nav>
            </footer>
        </div>
    );
};
