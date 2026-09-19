import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeBody, HomeListMenu, HomeListName } from "@/app/(app)/dashboard/(home)/home-body";
import { PageHeader } from "@/components/app/page-header";
import { HomeBodyOutline } from "@/components/app/skeletons";
import { YouLink } from "@/components/app/you-link";
import { askedList } from "@/lib/home-list";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Home" };

/* Until the binders are read, the list the address asks for, so a wishlist is not called Collection
   first. A binder's name needs that read: its room stands there instead. */
async function AskedTitle({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    const list = askedList((await searchParams).value);
    if (list === "all") return "Collection";
    if (list === "wishlist") return "Wishlist";
    if (list === "favorites") return "Favorites";
    return <span aria-hidden="true" className="inline-block h-8 w-40 rounded-md bg-skeleton motion-safe:animate-pulse" />;
}

// Home: the value first, big, with its line and the period it moved over; then the counts. The
// title and the three counts come with the page; the value section and the Pokémon tile stream
// in behind them, each with an outline in its place.
export default function DashboardPage({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
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
                    <Suspense fallback={null}>
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
