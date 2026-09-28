"use client";

import { type ReactNode, Suspense, use, useState } from "react";
import dynamic from "next/dynamic";
import { LinkButton } from "@/components/app/link-button";
import { MoverList } from "@/components/app/movers";
import { useReturnHrefs } from "@/components/app/sign-in-invite";
import type { Mover, PokemonCard } from "@/lib/api-shapes";
import { cardFromPokemonCard } from "@/lib/card-shapes";
import { sheetEditionOf, sheetPrintingOf } from "@/lib/price-change";
import { TILE_SURFACE } from "@/lib/tile";
import { cx } from "@/utils/cx";

/**
 * Home for somebody with no account: the page's own shape, not one door in the middle of nothing.
 *
 * The three places Home is made of stand where they stand for everybody else, each with one line
 * saying what would be there (Bart, 2026-09-23, after pressing Home as a visitor and being handed
 * a login form). The pattern is Tubi's "My Stuff" signed out: every section present, a sentence
 * instead of a row of films. The weaker shape, one centred "please log in", sells nothing, because
 * you cannot see what you are missing.
 *
 * Nothing here is a number and nothing here is a line on a chart. A drawn chart of a collection
 * nobody has is a lie on the first page a stranger sees. What is drawn is the frame a section
 * occupies, which is true: that is where the thing goes.
 *
 * The sentences say what the reader gains, never what we require: "the cards that rose and fell
 * most" is a reason, "create an account to see this" is a notice about our wall. And there is one
 * way in, at the end, rather than one per section, which would be nagging.
 *
 * The way in is this app's own pair, from sign-in-invite.tsx: the same two words in the same order
 * as the bar on every public page, each carrying the page the visitor is on.
 *
 * Revised the same day at the owner's word: the way in stands at the top, and the value and its
 * line are drawn as a blurred picture behind their headings rather than as empty frames. Still
 * nothing invented, and that is the line this holds: the picture is a shape, a rising line where
 * the chart goes, with not one figure anywhere in the page. A
 * blurred sample that could be read ("EUR 4,320") would be a made-up collection; a shape cannot
 * be read, copied or spoken. Quicken's signed-out dashboard is the pattern (Mobbin), and Origin's,
 * where a sample figure stays legible through the blur, is the one not to copy.
 */
type Market = { up: Mover[]; down: Mover[] } | null;

/* The sheet's code, asked for as a pointer or the focus reaches the movers, so a tap does not wait on it. */
const preloadSheet = () => void import("@/components/app/card-detail-slideout");
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

export function HomeSignInInvite({ market = Promise.resolve(null) }: { market?: Promise<Market> }) {
    return (
        <div className="flex flex-1 arrive flex-col gap-8">
            {/* First, before anything it describes: a stranger should know at once what this page is
                for and how to have it (Bart, 2026-09-23), on the picture of what it would show rather
                than in a tile of its own above it (Bart, 2026-09-28). */}
            <Preview />

            {/* The most room of the three, the owner's strongest thing to show. They stream in: the way
                in above never waits for them, and until they come, or when the market cannot be
                read, their place keeps its empty frames. */}
            <Suspense fallback={<MoverFrames />}>
                <MarketMovers market={market} />
            </Suspense>
        </div>
    );
}

/**
 * The week's biggest moves across every card, the owner's idea: not a picture of a collection nobody
 * has, but real moves anybody may see. The same list a reader's own movers draw in, so the two read as
 * one thing. A row opens the card's catalogue sheet, the one a set page opens for a card nobody holds:
 * its price line, its details and the two ways to take it, which ask to sign in (Bart, 2026-09-28:
 * rows that looked like cards and could not be opened). The arrows step through Up and then Down.
 */
function MarketMovers({ market }: { market: Promise<Market> }) {
    const movers = use(market);
    const [at, setAt] = useState<number | null>(null);
    /* The sheet is the app's largest client chunk: fetched on the first tap, not with the page, and
       kept mounted after that so it can close with its animation and hand focus back. */
    const [wanted, setWanted] = useState(false);
    const openAt = (i: number) => {
        setWanted(true);
        setAt(i);
    };
    if (!movers) return <MoverFrames />;
    const all = [...movers.up, ...movers.down];
    const open = at === null ? null : (all[at] ?? null);
    const step = (by: number) => (at !== null && all[at + by] ? () => setAt(at + by) : null);
    return (
        <Place heading="Biggest movers this week" line="The cards whose price moved most in the last 7 days, across every card there is">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" onPointerEnter={preloadSheet} onFocus={preloadSheet}>
                <MoverList title="Up" movers={movers.up} empty="Nothing rose this week." onOpen={openAt} href={null} linkLabel="" />
                <MoverList
                    title="Down"
                    movers={movers.down}
                    empty="Nothing fell this week."
                    onOpen={(i) => openAt(movers.up.length + i)}
                    href={null}
                    linkLabel=""
                />
            </div>
            {wanted ? (
                <CardDetailSlideout
                    card={open ? cardFromPokemonCard(catalogueCard(open)) : null}
                    addable={open ? catalogueCard(open) : null}
                    /* On the printing and the run that moved, so the sheet's price and line are the row's (1st Edition, not Unlimited). */
                    printing={open ? sheetPrintingOf(open.printing) : null}
                    edition={open ? sheetEditionOf(open.printing) : null}
                    readsRow
                    onClose={() => setAt(null)}
                    onPrev={step(-1)}
                    onNext={step(1)}
                    period="7d"
                />
            ) : null}
        </Place>
    );
}

/**
 * A market mover as the catalogue card the sheet reads. Nobody was asked what the reader holds, so
 * `holding` is null and the sheet says what an account keeps rather than "you own none". The row's
 * rarity place carries the printing that moved, not a rarity, so the card has none here.
 */
const catalogueCard = (m: Mover): PokemonCard => ({
    id: m.tcgId,
    tcgId: m.tcgId,
    name: m.name,
    set: m.set,
    number: m.number,
    printedNumber: m.printedNumber ?? m.number,
    rarity: null,
    image: m.image,
    supertype: null,
    subtypes: null,
    hp: null,
    types: null,
    artist: null,
    series: null,
    releaseDate: null,
    setPrintedTotal: null,
    flavorText: null,
    nationalPokedexNumbers: null,
    holding: null,
    price: m.now,
    listingPrice: null,
});

/** The movers' place before they arrive, or when the market cannot be read: two tiles side by side from sm. */
function MoverFrames() {
    return (
        <Place heading="Biggest movers" line="The cards that rose and fell most, so you know what moved without checking each one">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Frame className="h-44 sm:h-56" title="Up" />
                <Frame className="h-44 sm:h-56" title="Down" />
            </div>
        </Place>
    );
}

/**
 * The value and its line, as a picture behind the way in.
 *
 * The way in is real text in front and names what the picture stands for ("the value, the line
 * and the movers"), so a reader hearing the page misses nothing. The picture behind is decoration and hidden from a screen reader: a line that
 * climbs, blurred, with the way in over it (Bart, 2026-09-28). No
 * figure is drawn, so there is nothing to read, copy or be read aloud.
 */
function Preview() {
    return (
        <div className={cx(TILE_SURFACE, "relative isolate overflow-hidden")}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 blur-sm select-none">
                <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-3/5 w-full text-fg-primary">
                    <defs>
                        <linearGradient id="home-preview-fade" x1={0} y1={0} x2={0} y2={1}>
                            <stop offset={0} stopColor="currentColor" stopOpacity={0.22} />
                            <stop offset={1} stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {/* A line that climbs with a few turns, the shape of a collection going somewhere. */}
                    <path d={`${LINE} L400,120 L0,120 Z`} fill="url(#home-preview-fade)" />
                    <path d={LINE} className="stroke-fg-primary opacity-50" strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
            </div>

            <div className="flex min-h-64 items-center justify-center p-5 sm:min-h-72 sm:p-6">
                <WayIn />
            </div>
        </div>
    );
}

/** The climbing line behind the preview. A shape, not a series: no point on it is a reading. */
const LINE = "M0,96 C40,92 60,78 100,80 C140,82 160,60 200,58 C240,56 255,70 290,52 C320,38 350,34 400,18";

/**
 * One of Home's places: a heading in the document, in order, so a reader hearing the page gets the
 * same three sections in the same order as a reader seeing it, and the line under it.
 */
function Place({ heading, line, children }: { heading: string; line: string; children?: ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-md font-semibold text-primary">{heading}</h2>
                <p className="text-sm text-tertiary">{line}</p>
            </div>
            {children}
        </section>
    );
}

/** The room a section's contents take, with the tile's own edge and nothing inside it. */
function Frame({ className, title }: { className?: string; title?: string }) {
    return (
        <div className={cx(TILE_SURFACE, "flex flex-col p-4 sm:p-5", className)}>
            {title ? <h3 className="text-sm font-semibold text-tertiary">{title}</h3> : null}
        </div>
    );
}

/** The one way in, at the top, on the picture of the value and its line: what this page is and how to have it. */
function WayIn() {
    const { signIn, signUp } = useReturnHrefs();
    return (
        <section className="flex max-w-md flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-1">
                <h2 className="text-md font-semibold text-primary">Home fills up with your own cards</h2>
                <p className="text-sm text-tertiary">Add one card and the value, the line and the movers are yours from then on.</p>
            </div>
            {/* The same pair, in the same order and the same words, as every other door in the app. */}
            <div className="flex shrink-0 gap-3">
                <LinkButton href={signIn} color="tertiary" size="md">
                    Sign in
                </LinkButton>
                <LinkButton href={signUp} size="md">
                    Get started
                </LinkButton>
            </div>
        </section>
    );
}
