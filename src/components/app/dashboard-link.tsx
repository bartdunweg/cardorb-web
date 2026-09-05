import Link from "next/link";
import { Avatar } from "@/components/base/avatar/avatar";

// The way back from a public page for a person who is signed in: their avatar and name as a pill
// that leads to their dashboard. A control like the row's buttons, so it reads as something to
// press; no menu, since the dashboard has one. The name truncates before the bar does.
export function DashboardLink({ account }: { account: { name: string; avatarUrl: string | null } }) {
    return (
        <Link
            href="/dashboard"
            aria-label={`${account.name}, to your dashboard`}
            className="flex pressable items-center gap-2 rounded-full bg-primary py-1 pr-3 pl-1 ring-1 ring-primary outline-offset-2 outline-focus-ring transition-colors duration-150 ring-inset hover:bg-primary_hover focus-visible:outline-2"
        >
            <Avatar size="sm" src={account.avatarUrl ?? undefined} alt="" />
            <span className="max-w-32 truncate text-sm font-semibold text-primary">{account.name}</span>
        </Link>
    );
}
