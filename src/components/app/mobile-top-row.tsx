import Link from "next/link";
import { MobileSearchSheet } from "@/components/app/mobile-search";
import { Avatar } from "@/components/base/avatar/avatar";
import { accountFrom, getMyProfile } from "@/lib/profile";

// The top of Home and Browse on a phone: your picture, which is the You page, and on Browse the
// card search beside it. Home has no search: Browse is where a card is looked for. The desktop
// has both in the sidebar, so the row is not drawn from lg.
export async function MobileTopRow({ search = true }: { search?: boolean }) {
    // The layout's cached read: the same answer the tab bar's You tab drew from.
    const account = accountFrom(await getMyProfile());
    return (
        <div className="flex items-center justify-end gap-3 lg:hidden">
            {search ? (
                <div className="min-w-0 flex-1">
                    <MobileSearchSheet />
                </div>
            ) : null}
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
