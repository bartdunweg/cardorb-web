import { Suspense } from "react";
import type { Metadata } from "next";
import { BindersGrid, NewBinderButton } from "@/components/app/binders-grid";
import { PageHeader } from "@/components/app/page-header";
import { SignInInvite } from "@/components/app/sign-in-invite";
import { BindersOutline } from "@/components/app/skeletons";
import { session } from "@/lib/api";
import { getBinderOverview } from "@/lib/binders";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
// Out of the index: an empty Binders page in a search result is worse than none.
export const metadata: Metadata = { title: "Binders", robots: { index: false } };

export default async function BindersPage() {
    const mine = await session();
    // Before any read of the person's: a visitor gets an invitation where an error or a blank would
    // have been, and the page keeps its title so they still know which page answered.
    if (!mine)
        return (
            <div className="flex flex-1 flex-col gap-6">
                <PageHeader title="Binders" />
                <SignInInvite place="binders" />
            </div>
        );

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Binders"
                // The page's own action is a new binder, with the plus. Add card left
                // this page: the search opens the same palette, and a card is added from inside a binder,
                // where it has somewhere to go (Bart's call, 2026-09-18).
                actions={
                    <div className="flex items-center gap-3 max-lg:hidden">
                        <NewBinderButton />
                    </div>
                }
                barActions={<NewBinderButton compact />}
            />
            {/* The tiles are the read; the title and both actions are not, so they do not wait for it. */}
            <Suspense fallback={<BindersOutline />}>
                <Binders />
            </Suspense>
        </div>
    );
}

async function Binders() {
    const { binders, favoritesCount } = await getBinderOverview();
    return <BindersGrid binders={binders} favoritesCount={favoritesCount} />;
}
