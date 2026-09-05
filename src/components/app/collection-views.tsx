"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/utils/cx";

// The four views on the collection, as a segmented control above a page's title on a phone. On
// desktop the sidebar's Collection section is the same four; this stays hidden there.
const views = [
    { label: "All cards", href: "/dashboard/cards" },
    { label: "Sets", href: "/dashboard/sets" },
    { label: "Pokédex", href: "/dashboard/pokedex" },
    { label: "Favorites", href: "/dashboard/favorites" },
];

export function CollectionViews() {
    const pathname = usePathname();

    return (
        <nav aria-label="Collection views" className="flex rounded-full bg-secondary p-0.5 lg:hidden">
            {views.map((view) => {
                const active = pathname.startsWith(view.href);
                return (
                    <Link
                        key={view.href}
                        href={view.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                            "flex flex-1 pressable items-center justify-center rounded-full py-1.5 text-sm font-medium whitespace-nowrap outline-focus-ring transition-colors focus-visible:outline-2",
                            active ? "bg-primary text-primary shadow-xs" : "text-tertiary hover:text-secondary",
                        )}
                    >
                        {view.label}
                    </Link>
                );
            })}
        </nav>
    );
}
