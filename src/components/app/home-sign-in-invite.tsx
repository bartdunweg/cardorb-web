"use client";

import type { ReactNode } from "react";
import { LinkButton } from "@/components/app/link-button";
import { MoverList } from "@/components/app/movers";
import { useReturnHrefs } from "@/components/app/sign-in-invite";
import type { Mover } from "@/lib/api-shapes";
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
 * nothing invented, and that is the line this holds: the picture is a shape, a block where the
 * total goes and a rising line where the chart goes, with not one figure anywhere in the page. A
 * blurred sample that could be read ("EUR 4,320") would be a made-up collection; a shape cannot
 * be read, copied or spoken. Quicken's signed-out dashboard is the pattern (Mobbin), and Origin's,
 * where a sample figure stays legible through the blur, is the one not to copy.
 */
export function HomeSignInInvite({ market = null }: { market?: { up: Mover[]; down: Mover[] } | null }) {
    return (
        <div className="flex flex-1 arrive flex-col gap-8">
            {/* First, before anything it describes: a stranger should know at once what this page is
                for and how to have it, and the preview under it shows the rest (Bart, 2026-09-23). */}
            <WayIn />

            <Preview />

            {/* The most room of the three: the owner called the movers the strongest thing we can
                show of a collection, so they get the shape they really have, two tiles side by side
                from sm, each holding its own heading and nothing else. */}
            {market ? (
                /* Real data, and the owner's idea: not a picture of a collection nobody has, but the
                   week's biggest moves across every card, which anybody may see. The same list a
                   reader's own movers draw in, so the two read as one thing; the rows are text,
                   since opening a card from here would read the reader's own rows. */
                <Place heading="Biggest movers this week" line="The cards whose price moved most in the last 7 days, across every card there is">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <MoverList title="Up" movers={market.up} empty="Nothing rose this week." href={null} linkLabel="" />
                        <MoverList title="Down" movers={market.down} empty="Nothing fell this week." href={null} linkLabel="" />
                    </div>
                </Place>
            ) : (
                <Place heading="Biggest movers" line="The cards that rose and fell most, so you know what moved without checking each one">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <Frame className="h-44 sm:h-56" title="Up" />
                        <Frame className="h-44 sm:h-56" title="Down" />
                    </div>
                </Place>
            )}
        </div>
    );
}

/**
 * The value and its line, as a picture behind their headings.
 *
 * The headings and their sentences are real text in front, so a reader hearing the page gets both
 * sections in order. The picture behind is decoration and hidden from a screen reader: a block where
 * the total stands, a smaller one where its change stands, and a line that climbs, all blurred. No
 * figure is drawn, so there is nothing to read, copy or be read aloud.
 */
function Preview() {
    return (
        <div className={cx(TILE_SURFACE, "relative isolate overflow-hidden")}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 blur-sm select-none">
                <div className="flex flex-col gap-3 px-5 pt-16 sm:px-6 sm:pt-18">
                    {/* Where the total is: a wide block at the size of a hero figure, and its change under it. */}
                    <div className="h-10 w-48 rounded-lg bg-primary-solid opacity-20 sm:h-12 sm:w-64" />
                    <div className="h-4 w-32 rounded bg-primary-solid opacity-10" />
                </div>
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

            <div className="flex min-h-64 flex-col justify-between gap-10 p-5 sm:min-h-72 sm:p-6">
                <Heading heading="Total value" line="What your collection is worth, updated every day" />
                <Heading heading="Value over time" line="See how your collection moved this week, and over the last year" />
            </div>
        </div>
    );
}

/** The climbing line behind the preview. A shape, not a series: no point on it is a reading. */
const LINE = "M0,96 C40,92 60,78 100,80 C140,82 160,60 200,58 C240,56 255,70 290,52 C320,38 350,34 400,18";

function Heading({ heading, line }: { heading: string; line: string }) {
    return (
        <div className="flex max-w-md flex-col gap-1">
            <h2 className="text-md font-semibold text-primary">{heading}</h2>
            <p className="text-sm text-secondary">{line}</p>
        </div>
    );
}

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

/** The one way in, at the top: what this page is and how to have it, before the picture of it. */
function WayIn() {
    const { signIn, signUp } = useReturnHrefs();
    return (
        <section className={cx(TILE_SURFACE, "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6")}>
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
