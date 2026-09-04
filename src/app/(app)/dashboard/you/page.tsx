import { SettingsForm } from "@/components/app/settings-form";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { accountFrom, getMyProfile } from "@/lib/profile";

// The fifth tab on a phone: the account at the top, the settings under it, Sign out at the end.
// On desktop the sidebar's account menu and the Settings page carry the same.
export default async function YouPage() {
    // The same read the layout made: one per name per request, so no second call.
    const me = await getMyProfile();
    const account = accountFrom(me);

    if (!me.profile) {
        return <p className="text-sm text-tertiary">Could not load your profile. Please try again.</p>;
    }

    return (
        <SettingsForm
            profile={me.profile}
            email={me.email}
            heading={
                <h1>
                    <AvatarLabelGroup size="lg" src={account.avatarUrl ?? undefined} alt="" title={account.name} subtitle={account.email} />
                </h1>
            }
        />
    );
}
