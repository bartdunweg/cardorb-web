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
export const metadata: Metadata = { title: "Settings" };

// `?profile=1` opens the profile sheet on arrival: Home's "Choose your name" sends people here
// for one field, and that field is behind Manage.
export default function SettingsPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
    return (
        <Suspense fallback={<PanelsSkeleton title="Settings" subtitle="Manage your account and preferences." panels={4} />}>
            <Settings searchParams={searchParams} />
        </Suspense>
    );
}

async function Settings({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
    const [{ profile, email }, params] = await Promise.all([getMyProfile(), searchParams]);

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
            openProfile={params.profile === "1"}
            heading={<PageHeader title="Settings" subtitle="Manage your account and preferences." back={{ href: "/dashboard", label: "Home" }} />}
        />
    );
}
