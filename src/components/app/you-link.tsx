import Link from "next/link";
import { Avatar } from "@/components/base/avatar/avatar";
import { accountFrom, getMyProfile } from "@/lib/profile";

// Your picture as the link to the You page, for a phone, beside Home's title. The desktop has it
// in the sidebar, so it is not drawn from lg.
export async function YouLink() {
    // The layout's cached read: the same answer the sidebar's account card drew from.
    const account = accountFrom(await getMyProfile());
    return (
        <Link
            href="/dashboard/you"
            aria-label={`You, ${account.name}`}
            // In Home's bar, the size of Back beside it.
            className="shrink-0 pressable self-center rounded-full outline-offset-2 outline-focus-ring focus-visible:outline-2 lg:hidden"
        >
            <Avatar size="sm" src={account.avatarUrl ?? undefined} alt="" className="size-11" />
        </Link>
    );
}
