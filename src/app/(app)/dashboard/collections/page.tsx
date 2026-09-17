import { Suspense } from "react";
import type { Metadata } from "next";
import { AddCardButton } from "@/components/app/add-card-button";
import { BindersGrid, NewBinderButton } from "@/components/app/binders-grid";
import { PageHeader } from "@/components/app/page-header";
import { BindersOutline } from "@/components/app/skeletons";
import { getBinderOverview } from "@/lib/binders";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Binders" };

export default function BindersPage() {
    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Binders"
                // Add card is the app's main action and opens the one palette, here as everywhere on a
                // desktop; a new binder is the page's own thing and sits beside it as the secondary. On a
                // phone the bar carries the new binder alone: this is the list of binders, and a card is
                // added from inside one, where it has somewhere to go (Bart's call).
                actions={
                    <div className="flex items-center gap-3 max-lg:hidden">
                        <NewBinderButton />
                        <AddCardButton />
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
