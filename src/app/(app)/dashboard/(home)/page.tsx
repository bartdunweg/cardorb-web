import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeBody, HomeListMenu } from "@/app/(app)/dashboard/(home)/home-body";
import { PageHeader } from "@/components/app/page-header";
import { HomeBodyOutline } from "@/components/app/skeletons";
import { YouLink } from "@/components/app/you-link";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Home" };

// Home: the value first, big, with its line and the period it moved over; then the counts. The
// title and the three counts come with the page; the value section and the Pokémon tile stream
// in behind them, each with an outline in its place.
export default function DashboardPage({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Home"
                shortTitle
                // Which list Home is about, beside the avatar across from the title (Bart's call, 2026-09-19); the
                // search is the round button beside the tab bar. The choice waits on the binders, the avatar does not.
                actions={
                    <>
                        <Suspense fallback={null}>
                            <HomeListMenu searchParams={searchParams} />
                        </Suspense>
                        <YouLink />
                    </>
                }
            />
            {/* The title is on screen before the stats are read, and the outline
                stands where the value and the tiles go. */}
            <Suspense fallback={<HomeBodyOutline />}>
                <HomeBody searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
