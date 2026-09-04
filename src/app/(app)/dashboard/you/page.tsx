import { PageHeader } from "@/components/app/page-header";
import { YouMenu } from "@/components/app/you-menu";
import { accountFrom, getMyProfile } from "@/lib/profile";

// The fifth tab on a phone: the account and what the tab bar has no room for. On desktop the
// sidebar carries all of it, so this page is only linked from the tab bar.
export default async function YouPage() {
    // The same read the layout made: one per name per request, so no second call.
    const me = await getMyProfile();
    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader title="You" />
            <YouMenu account={accountFrom(me)} />
        </div>
    );
}
