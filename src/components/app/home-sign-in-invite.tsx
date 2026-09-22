"use client";

import type { ReactNode } from "react";
import { LinkButton } from "@/components/app/link-button";
import { useReturnHrefs } from "@/components/app/sign-in-invite";
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
 */
export function HomeSignInInvite() {
    return (
        <div className="flex flex-1 arrive flex-col gap-8">
            {/* The value, where the big number is for an account that has one. No frame: anything
                boxed and empty in a number's place reads as a number that failed to arrive. */}
            <Place heading="Total value" line="What your collection is worth, updated every day" />

            <Place heading="Value over time" line="See how your collection moved this week, and over the last year">
                <Frame className="h-40 sm:h-52" />
            </Place>

            {/* The most room of the three: the owner called the movers the strongest thing we can
                show of a collection, so they get the shape they really have, two tiles side by side
                from sm, each holding its own heading and nothing else. */}
            <Place heading="Biggest movers" line="The cards that rose and fell most, so you know what moved without checking each one">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <Frame className="h-44 sm:h-56" title="Up" />
                    <Frame className="h-44 sm:h-56" title="Down" />
                </div>
            </Place>

            <WayIn />
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

/** The one way in, after the three places, so the reader has seen what it is for before it asks. */
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
