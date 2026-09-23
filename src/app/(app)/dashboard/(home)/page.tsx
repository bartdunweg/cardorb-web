import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeBody, HomeListMenu, HomeListName } from "@/app/(app)/dashboard/(home)/home-body";
// Home's own invitation, the sibling of SignInInvite (sign-in-invite.tsx) that the closed places
// use: the same way in, in the shape of this page rather than one door in an empty room.
import { HomeSignInInvite } from "@/components/app/home-sign-in-invite";
import { PageHeader } from "@/components/app/page-header";
import { HomeBodyOutline } from "@/components/app/skeletons";
import { YouLink } from "@/components/app/you-link";
import { session } from "@/lib/api";
import { askedList } from "@/lib/home-list";
import { getMarketMovers } from "@/lib/market-movers";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
//
// Out of the index, because this page opens for a visitor and what it then holds is three sentences
// about a collection that is not there: an empty Home in a search result is worse than none.
export const metadata: Metadata = { title: "Home", robots: { index: false } };

/* Until the binders are read, the list the address asks for, so a wishlist is not called Collection
   first. A binder's name needs that read: its room stands there instead. */
async function AskedTitle({ searchParams, plain = false }: { searchParams: Promise<{ value?: string }>; plain?: boolean }) {
    const list = askedList((await searchParams).value);
    if (list === "all") return "Collection";
    if (list === "wishlist") return "Wishlist";
    if (list === "favorites") return "Favorites";
    // The bar's words cannot hold an outline: the page's name until the binder's is read.
    if (plain) return "Home";
    return <span aria-hidden="true" className="inline-block h-8 w-40 rounded-md bg-skeleton motion-safe:animate-pulse" />;
}

// Home: the value first, big, with its line and the period it moved over; then the counts. The
// title and the three counts come with the page; the value section and the Pokémon tile stream
// in behind them, each with an outline in its place.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    /* Nobody signed in: Home is its own shape with an explanation in each place, and not one read of
       a person's is started. It has to be decided here, before the tree is returned, because every
       read below begins the moment its component is drawn and the API refuses without a token: a
       visitor would get Home as an error page where an invitation belonged. */
    const mine = await session();
    if (!mine) {
        // The market's movers are the one real thing a visitor's Home can show: every card's price
        // is public, so the week's biggest moves across the catalogue are nobody's to hide. Started
        // here and not awaited: the way in draws at once and the movers stream in behind it.
        const market = getMarketMovers();
        return (
            <div className="flex flex-1 flex-col gap-6">
                {/* The page's own name, and none of the parts that need a read: no list to choose
                    between, and no picture of a person to link to. */}
                <PageHeader title="Home" />
                <HomeSignInInvite market={market} />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Home"
                // The title is the list Home is about, and pressing it switches (Bart's call, 2026-09-19). Until
                // the binders are read it says the collection, what Home shows unless the address asks otherwise.
                heading={
                    <Suspense
                        fallback={
                            <Suspense fallback={null}>
                                <AskedTitle searchParams={searchParams} />
                            </Suspense>
                        }
                    >
                        <HomeListMenu searchParams={searchParams} />
                    </Suspense>
                }
                // The bar says the same list once the title has scrolled under it, not the page's name.
                barTitle={
                    <Suspense
                        fallback={
                            <Suspense fallback="Home">
                                <AskedTitle searchParams={searchParams} plain />
                            </Suspense>
                        }
                    >
                        <HomeListName searchParams={searchParams} />
                    </Suspense>
                }
                actions={<YouLink />}
            />
            {/* The title is on screen before the stats are read, and the outline
                stands where the value and the tiles go. */}
            <Suspense fallback={<HomeBodyOutline />}>
                <HomeBody searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
