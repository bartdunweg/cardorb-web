"use client";

import { ChevronSelectorVertical, Eye, LogOut01, Settings01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null; publicUrl?: string | null };

// Account card that opens a dropdown with the public profile, Settings and Sign out. Compact, on
// the folded sidebar's rail, it is the avatar alone, named by a tooltip, and the menu opens beside it.
export function AccountMenu({ account, compact = false }: { account: Account; compact?: boolean }) {
    if (compact) {
        return (
            <Dropdown.Root>
                <Tooltip title={account.name} placement="right">
                    <AriaButton
                        aria-label={`Account: ${account.name}`}
                        className={({ isPressed, isFocusVisible }) =>
                            cx(
                                "relative inline-flex cursor-pointer rounded-full outline-offset-2 outline-focus-ring",
                                (isPressed || isFocusVisible) && "outline-2",
                            )
                        }
                    >
                        <Avatar size="md" src={account.avatarUrl ?? undefined} alt="" />
                    </AriaButton>
                </Tooltip>
                <Dropdown.Popover placement="right bottom" className="w-64">
                    <Dropdown.Menu>
                        <AccountMenuItems publicUrl={account.publicUrl} />
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
        );
    }

    return (
        <Dropdown.Root>
            <AriaButton
                className={({ isPressed, isFocusVisible }) =>
                    cx(
                        "relative w-full cursor-pointer rounded-lg p-2 text-left outline-offset-2 outline-focus-ring hover:bg-secondary",
                        (isPressed || isFocusVisible) && "outline-2",
                    )
                }
            >
                <AvatarLabelGroup size="md" src={account.avatarUrl ?? undefined} alt="" title={account.name} subtitle={account.email} className="pr-8" />
                <div className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md">
                    <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" />
                </div>
            </AriaButton>

            {/* The card sits at the sidebar's foot, so the menu opens upward. Left to react-aria's flip
                it sometimes measures the sliver of space under the card first and never flips back,
                and the menu opens off the bottom of the screen. */}
            <Dropdown.Popover placement="top left" className="w-64">
                <Dropdown.Menu>
                    <AccountMenuItems publicUrl={account.publicUrl} />
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}

// The account's own entries: the public profile, Settings (where the profile lives, and with it
// the choice between light and dark) and Sign out. Rendered inside a Dropdown.Menu here; the phone
// reaches them on the You page.
export function AccountMenuItems({ publicUrl }: { publicUrl?: string | null } = {}) {
    return (
        <>
            {/* The page others see, for the person whose it is; absent while the profile is private. */}
            {publicUrl ? (
                <Dropdown.Item icon={Eye} href={publicUrl}>
                    View public profile
                </Dropdown.Item>
            ) : null}
            <Dropdown.Item icon={Settings01} href="/dashboard/settings">
                Settings
            </Dropdown.Item>

            <Dropdown.Separator />

            <Dropdown.Item icon={LogOut01} onAction={() => void signOut()}>
                Sign out
            </Dropdown.Item>
        </>
    );
}
