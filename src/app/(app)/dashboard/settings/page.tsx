import { SettingsForm } from "@/components/app/settings-form";
import { getMyProfile } from "@/lib/profile";

export default async function SettingsPage() {
    const { profile, email } = await getMyProfile();

    if (!profile) {
        return <p className="text-sm text-tertiary">Could not load your profile. Please try again.</p>;
    }

    return <SettingsForm profile={profile} email={email} />;
}
