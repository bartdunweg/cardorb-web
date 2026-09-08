import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { LinkButton } from "@/components/app/link-button";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/app/settings-form";
import { getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
    const { profile, email } = await getMyProfile();

    if (!profile) {
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
            profile={profile}
            email={email}
            heading={<PageHeader title="Settings" subtitle="Manage your account and preferences." back={{ href: "/dashboard", label: "Home" }} />}
        />
    );
}
