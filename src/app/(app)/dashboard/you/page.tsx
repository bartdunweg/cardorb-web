import { SettingsForm } from "@/components/app/settings-form";
import { Avatar } from "@/components/base/avatar/avatar";
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
                // The name is the heading; the avatar and the email sit beside and under it, outside the h1.
                <div className="flex items-center gap-3">
                    <Avatar size="lg" src={account.avatarUrl ?? undefined} alt="" />
                    <div className="flex min-w-0 flex-col">
                        <h1 className="truncate text-lg font-semibold text-primary">{account.name}</h1>
                        <p className="truncate text-sm text-tertiary">{account.email}</p>
                    </div>
                </div>
            }
        />
    );
}
