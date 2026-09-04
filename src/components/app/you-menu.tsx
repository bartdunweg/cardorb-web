"use client";

import { Grid01, Heart, Star01 } from "@untitledui/icons";
import { AccountMenuItems } from "@/components/app/account-menu";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Dropdown } from "@/components/base/dropdown/dropdown";

type Account = { name: string; email: string; avatarUrl: string | null };

// What the sidebar has and the four tabs do not. The You page carries these, then the account's
// own entries, so nothing reachable on desktop is out of reach on a phone.
export const more = [
    { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
    { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
];

// The You page's body: the account, then the rest of the sidebar, then the account's entries.
export function YouMenu({ account }: { account: Account }) {
    return (
        <div className="flex flex-col gap-2">
            <AvatarLabelGroup size="md" src={account.avatarUrl ?? undefined} alt="" title={account.name} subtitle={account.email} className="px-2" />
            <Dropdown.Menu aria-label="You">
                {more.map((item) => (
                    <Dropdown.Item key={item.href} icon={item.icon} href={item.href}>
                        {item.label}
                    </Dropdown.Item>
                ))}
                <Dropdown.Separator />
                <AccountMenuItems />
            </Dropdown.Menu>
        </div>
    );
}
