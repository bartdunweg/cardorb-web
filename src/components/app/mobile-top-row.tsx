import Link from "next/link";
import { MobileSearchSheet } from "@/components/app/mobile-search";
import { Avatar } from "@/components/base/avatar/avatar";
import { accountFrom, getMyProfile } from "@/lib/profile";

// Your picture as the link to the You page, for a phone: beside Home's title, and beside the
// search at the top of Browse. The desktop has it in the sidebar, so it is not drawn from lg.
export async function YouLink() {
    // The layout's cached read: the same answer the sidebar's account card drew from.
    const account = accountFrom(await getMyProfile());
    return (
        <Link
            href="/dashboard/you"
            aria-label={`You, ${account.name}`}
            className="shrink-0 pressable rounded-full outline-offset-2 outline-focus-ring focus-visible:outline-2 lg:hidden"
        >
            <Avatar size="md" src={account.avatarUrl ?? undefined} alt="" />
        </Link>
    );
}

// The top of Browse on a phone: the card search with its scan button, and your picture beside it.
export function MobileTopRow() {
    return (
        <div className="flex items-center gap-3 lg:hidden">
            <div className="min-w-0 flex-1">
                <MobileSearchSheet />
            </div>
            <YouLink />
        </div>
    );
}
