import { CardCloud } from "@/components/app/card-cloud";
import { LinkButton } from "@/components/app/link-button";
import { OrbMark } from "@/components/app/orb-mark";
import { PublicTopBar } from "@/components/app/public-top-bar";
import { ThemeToggle } from "@/components/app/theme-switch";

// Public landing hero for Cardorb. Based on Untitled UI's hero-geometric-shapes-04, with the
// heavy marketing Header/nav replaced by the shared PublicTopBar and its buttons by plain links. The
// one react-aria piece is the theme toggle in the footer (the owner's call, 2026-10-01); the hero carries one call to
// action, Get started, so it never competes with the bar's pair.
//
// The mark, the words and the two ways in, centered, and nothing under them: the picture of
// Home that stood there went on the owner's call (2026-09-30).
export const HeroGeometricShapes04 = () => {
    return (
        <div className="relative flex min-h-dvh flex-col overflow-hidden bg-primary">
            <PublicTopBar />
            {/* Under the bar the cards go into the page, so its words never stand on a card (globals.css). */}
            <div className="card-cloud-veil-top" aria-hidden />

            {/* One screen high (the owner's call, 2026-10-02): the mark, the words and the two ways in,
                centred in what the bar and the footer leave, and the footer in view without a scroll.
                The orb grows where the screen is wide and tall and shrinks, with the air round it, where it is low. */}
            <main className="relative flex flex-1 flex-col justify-center py-2">
                <div className="mx-auto flex w-full max-w-container flex-col items-center px-4 md:px-8">
                    {/* Isolated, so the cloud of cards round the orb stays under the words and the buttons too. */}
                    <div className="relative isolate flex w-full max-w-3xl flex-col items-center text-center">
                        <div className="card-cloud-room relative flex">
                            <CardCloud className="-z-10" />
                            <OrbMark size={180} className="md:hidden short:hidden" />
                            <OrbMark size={120} className="hidden short:block md:short:hidden" />
                            <OrbMark size={150} className="hidden md:block tall:hidden short:hidden" />
                            <OrbMark size={110} className="hidden md:short:block" />
                            <OrbMark size={200} className="hidden md:tall:block" />
                        </div>
                        {/* The words, with the veil the cards go into behind them (globals.css, .card-cloud-veil). */}
                        <div className="relative flex w-full flex-col items-center">
                            <div className="card-cloud-veil" aria-hidden />
                            <h1 className="mt-6 text-display-sm font-medium text-balance text-primary md:text-display-md lg:text-display-lg short:mt-4">
                                Organize your trading card collection
                            </h1>
                            <p className="mt-4 max-w-120 text-lg text-balance text-tertiary md:mt-6 md:text-xl">
                                Browse, organize, and manage every card in one place.
                            </p>
                            {/* Two ways on, and not the same weight. Somebody who already trusts us presses
                            Get started and needs to see nothing first; the other button is for the one
                            who does not, which is the person this page has to win. Equal weight would
                            make neither read as the answer. */}
                            <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row md:mt-12 short:mt-6">
                                <LinkButton href="/signup" size="xl">
                                    Get started
                                </LinkButton>
                                <LinkButton href="/sets" color="secondary" size="xl">
                                    Browse the sets
                                </LinkButton>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* One-row footer: the legal pages with the theme toggle beside them (the owner's call; the
                copyright line went on his call, 2026-10-05), on the right from sm, centred on a phone. The
                toggle sits outside the nav: it changes the page, it goes nowhere. The API reference is
                not linked here: the API serves only our own apps, and a visitor cannot get a key. */}
            <footer className="relative z-10 mx-auto flex w-full max-w-container justify-center px-4 py-6 sm:justify-end md:px-8">
                <div className="flex items-center gap-6">
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
                    {/* Its button's own padding pulled back, so the icon stands 24 px from Terms, as Terms from
                        Privacy, and ends on the page's edge; a pixel down,
                        so it sits on the words' line (the owner's eye). */}
                    <ThemeToggle className="-mx-1.5 translate-y-px" />
                </div>
            </footer>
        </div>
    );
};
