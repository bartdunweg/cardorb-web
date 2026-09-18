import { Suspense } from "react";
import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { LinkButton } from "@/components/app/link-button";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/app/settings-form";
import { PanelsSkeleton } from "@/components/app/skeletons";
import { getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "You" };

// You, on a phone: the account at the top, the settings under it, Sign out at the end. On desktop
// the sidebar's account menu and the Settings page carry the same.
export default function YouPage() {
    // The title is known before anything is read; an empty subtitle, because the page has none.
    return (
        <Suspense fallback={<PanelsSkeleton title="You" subtitle="" panels={2} />}>
            <You />
        </Suspense>
    );
}

async function You() {
    // The same read the layout made: one per name per request, so no second call.
    const me = await getMyProfile();

    if (!me.profile) {
        return (
            <AppEmptyState icon="folder" title="Could not load your profile" description="Try again in a moment.">
                <LinkButton href="/dashboard" color="secondary" size="md">
                    Go to Home
                </LinkButton>
            </AppEmptyState>
        );
    }

    return (
        <SettingsForm
            profile={me.profile}
            email={me.email}
            // The page's name is the title, the word the tab bar uses. The picture, the name and the
            // address are the card right under it, with Manage beside them: in the title as well,
            // they were said twice, one above the other.
            heading={<PageHeader title="You" back={{ href: "/dashboard", label: "Home" }} />}
        />
    );
}
