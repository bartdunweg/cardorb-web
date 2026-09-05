"use client";

import type { FC } from "react";
import { Dataflow03, Folder, Grid01, Heart, Plus, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderDialog } from "@/components/app/folder-dialog";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { Facets } from "@/lib/cards";
import type { CollectionSummary } from "@/lib/collections";
import { cx } from "@/utils/cx";

// A tile with a count, or with a line of its own for a view that is not a pile of cards.
// `row` puts the icon beside the text instead of above it: for a tile that spans a phone's width,
// where a stacked icon would leave the right two thirds empty.
function FolderCard({
    href,
    icon,
    name,
    count,
    detail,
    row = false,
}: {
    href: string;
    icon: FC<{ className?: string }>;
    name: string;
    count?: number;
    detail?: string;
    row?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cx(
                "flex pressable gap-3 rounded-xl bg-primary p-4 shadow-border outline-focus-ring transition-[color,background-color,box-shadow] hover:bg-secondary hover:shadow-border_hover focus-visible:outline-2",
                row ? "flex-row items-center xs:flex-col xs:items-stretch" : "flex-col",
            )}
        >
            <FeaturedIcon color="gray" theme="modern-neue" size="lg" icon={icon} />
            <div className="flex flex-col">
                <span className="truncate text-sm font-semibold text-primary">{name}</span>
                <span className="text-sm text-tertiary">{detail ?? `${count} card${count === 1 ? "" : "s"}`}</span>
            </div>
        </Link>
    );
}

// Beside the page title: a plus on a phone, the words from sm up. Both open the dialog below.
export function NewCollectionButton({ facets }: { facets: Facets }) {
    return (
        <>
            <FolderDialog mode="create" facets={facets}>
                <Button iconLeading={Plus} aria-label="New folder" className="sm:hidden" />
            </FolderDialog>
            <FolderDialog mode="create" facets={facets}>
                <Button iconLeading={Plus} className="max-sm:hidden">
                    New folder
                </Button>
            </FolderDialog>
        </>
    );
}

export function CollectionsGrid({
    collections,
    favoritesCount,
    wishlistCount,
    facets,
}: {
    collections: CollectionSummary[];
    favoritesCount: number;
    wishlistCount: number;
    facets: Facets;
}) {
    const hasCollections = collections.length > 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* Three folders that are always there, above the ones you made: the favorites (a flag on a card), the
                wishlist (cards not owned) and the Pokédex (every Pokémon, with the slots you have no card of). None is
                a folder in the data; all three are one to the eye. */}
            <div className="grid grid-cols-1 gap-4 xs:grid-cols-3 lg:grid-cols-4">
                <FolderCard href="/dashboard/favorites" icon={Star01} name="Favorites" count={favoritesCount} row />
                <FolderCard href="/dashboard/wishlist" icon={Heart} name="Wishlist" count={wishlistCount} row />
                <FolderCard href="/dashboard/pokedex" icon={Grid01} name="Pokédex" detail="Cards by Pokémon" row />
            </div>

            {hasCollections ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {collections.map((c) => (
                        <FolderCard
                            key={c.id}
                            href={`/dashboard/collections/${c.id}`}
                            icon={c.kind === "rule" ? Dataflow03 : Folder}
                            name={c.name}
                            count={c.count}
                            detail={c.kind === "rule" ? `${c.count} card${c.count === 1 ? "" : "s"} · by rule` : undefined}
                        />
                    ))}
                </div>
            ) : (
                // On a phone the hub above is the page and the plus beside the title is the way in; the
                // empty state would only push the tab bar's worth of nothing under three tiles.
                <div className="hidden lg:contents">
                    <AppEmptyState icon="folder" title="No folders yet" description="Group your cards into folders you can jump to from the sidebar.">
                        <FolderDialog mode="create" facets={facets}>
                            <Button iconLeading={Plus}>Create folder</Button>
                        </FolderDialog>
                    </AppEmptyState>
                </div>
            )}
        </div>
    );
}
