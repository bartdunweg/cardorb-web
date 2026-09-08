import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { LinkButton } from "@/components/app/link-button";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/app/settings-form";
import { Avatar } from "@/components/base/avatar/avatar";
import { accountFrom, getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "You" };

// You, on a phone: the account at the top, the settings under it, Sign out at the end. On desktop
// the sidebar's account menu and the Settings page carry the same.
export default async function YouPage() {
    // The same read the layout made: one per name per request, so no second call.
    const me = await getMyProfile();
    const account = accountFrom(me);

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
            // The name is the title and the email its line; the picture stands beside them.
            heading={
                <PageHeader
                    title={account.name}
                    subtitle={account.email}
                    back={{ href: "/dashboard", label: "Home" }}
                    actions={<Avatar size="lg" src={account.avatarUrl ?? undefined} alt="" />}
                />
            }
        />
    );
}
