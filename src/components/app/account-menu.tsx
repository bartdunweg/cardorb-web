"use client";

import { ChevronSelectorVertical, Eye, LogOut01, Moon01, Settings01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { signOut } from "@/app/(auth)/actions";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useTheme } from "@/providers/theme";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null; publicUrl?: string | null };

// Account card that opens a dropdown with Settings, a real dark-mode Toggle, and Sign out.
export function AccountMenu({ account }: { account: Account }) {
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
                <AvatarLabelGroup
                    size="md"
                    src={account.avatarUrl ?? undefined}
                    alt={account.name}
                    title={account.name}
                    subtitle={account.email}
                    className="pr-8"
                />
                <div className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md">
                    <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" />
                </div>
            </AriaButton>

            <Dropdown.Popover className="w-64">
                <Dropdown.Menu>
                    <AccountMenuItems publicUrl={account.publicUrl} />
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}

// The account's own entries: Settings (which is where the profile lives), the dark-mode toggle, Sign out. Rendered inside a
// Dropdown.Menu, here and at the end of the mobile tab bar's More menu.
export function AccountMenuItems({ publicUrl }: { publicUrl?: string | null } = {}) {
    const { resolvedTheme, setTheme } = useTheme();
    // The theme is undefined on the server and the first client render alike, so reading it
    // directly matches on both and resolves after hydration — no mount flag, no mismatch.
    const isDark = resolvedTheme === "dark";

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

            <Dropdown.Section
                selectionMode="multiple"
                selectedKeys={isDark ? new Set(["dark-mode"]) : new Set<string>()}
                onSelectionChange={(keys) => {
                    const dark = keys === "all" || (keys instanceof Set && keys.has("dark-mode"));
                    setTheme(dark ? "dark" : "light");
                }}
            >
                <Dropdown.Item id="dark-mode" icon={Moon01} selectionIndicator="toggle">
                    Dark mode
                </Dropdown.Item>
            </Dropdown.Section>

            <Dropdown.Separator />

            <Dropdown.Item icon={LogOut01} onAction={() => void signOut()}>
                Sign out
            </Dropdown.Item>
        </>
    );
}
