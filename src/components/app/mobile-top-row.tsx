import Link from "next/link";
import { MobileSearchSheet } from "@/components/app/mobile-search";
import { Avatar } from "@/components/base/avatar/avatar";
import { accountFrom, getMyProfile } from "@/lib/profile";

// The top of Home and Browse on a phone: the search a card, and beside it your picture, which is
// the You page. The desktop has both in the sidebar, so the row is not drawn from lg.
export async function MobileTopRow() {
    // The layout's cached read: the same answer the tab bar's You tab drew from.
    const account = accountFrom(await getMyProfile());
    return (
        <div className="flex items-center gap-3 lg:hidden">
            <div className="min-w-0 flex-1">
                <MobileSearchSheet />
            </div>
            <Link
                href="/dashboard/you"
                aria-label={`You, ${account.name}`}
                className="shrink-0 pressable rounded-full outline-offset-2 outline-focus-ring focus-visible:outline-2"
            >
                <Avatar size="md" src={account.avatarUrl ?? undefined} alt="" />
            </Link>
        </div>
    );
}
