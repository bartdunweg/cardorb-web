"use client";

import { usePathname } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { LinkButton } from "@/components/app/link-button";
import { withReturn } from "@/lib/return-to";

/**
 * The state behind every closed place: binders, the collection, the wishlist, the Pokédex.
 *
 * Nothing is greyed out and nothing is hidden (Bart, 2026-09-22): the section stays in the
 * navigation, the control stays pressable, and the explanation arrives at the press. One
 * component draws it, so the same thing is not said four slightly different ways.
 */

/** Sign in and Create account, both carrying the page the visitor is on. */
export function useReturnHrefs(): { signIn: string; signUp: string } {
    const here = usePathname() || "/";
    return { signIn: withReturn("/login", here), signUp: withReturn("/signup", here) };
}

// What an account adds, per place, in the place's own words. The heading names the thing, the
// sentence says what it does for you: "sign in to continue" names our wall instead of their reason.
const INVITES = {
    binders: {
        icon: "folder",
        title: "Binders come with an account",
        description: "A binder is a place you put cards, filled by hand or by a rule you set, and Favorites is there from the start.",
    },
    collection: {
        icon: "book",
        title: "Your collection comes with an account",
        description: "Every card you own in one place, with what it is worth today and what it was worth last month.",
    },
    wishlist: {
        icon: "heart",
        title: "The wishlist comes with an account",
        description: "The cards you are still after, kept in one list and priced like the ones you hold.",
    },
    pokedex: {
        icon: "star",
        title: "The Pokédex comes with an account",
        description: "Every Pokémon you hold a card of, lighting up one slot at a time as your collection grows.",
    },
} as const;

export type ClosedPlace = keyof typeof INVITES;

export function SignInInvite({ place, compact = false }: { place: ClosedPlace; compact?: boolean }) {
    const invite = INVITES[place];
    const { signIn, signUp } = useReturnHrefs();
    /*
     * Compact, for a page that has something real to show under it. The Pokedex draws its 1,025
     * slots for a visitor, and a full empty state above them would push the thing it describes a
     * screen down. The same words, the same pair of links, in one band.
     */
    if (compact)
        return (
            <section
                aria-labelledby={`invite-${place}`}
                className="flex flex-col gap-3 rounded-xl bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="flex flex-col gap-1">
                    <h2 id={`invite-${place}`} className="text-md font-semibold text-primary">
                        {invite.title}
                    </h2>
                    <p className="text-sm text-tertiary">{invite.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <LinkButton href={signIn} color="tertiary" size="md">
                        Sign in
                    </LinkButton>
                    <LinkButton href={signUp} size="md">
                        Get started
                    </LinkButton>
                </div>
            </section>
        );
    return (
        <AppEmptyState icon={invite.icon} title={invite.title} description={invite.description}>
            {/* The same pair, in the same order and the same words, as the bar on every public page
                (public-top-bar.tsx). Links, because they navigate. */}
            <LinkButton href={signIn} color="tertiary" size="md">
                Sign in
            </LinkButton>
            <LinkButton href={signUp} size="md">
                Get started
            </LinkButton>
        </AppEmptyState>
    );
}
