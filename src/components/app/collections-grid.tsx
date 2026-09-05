"use client";

import type { FC } from "react";
import { Dataflow03, Folder, Plus, Rows01, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderDialog } from "@/components/app/folder-dialog";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { Facets } from "@/lib/cards";
import type { CollectionSummary } from "@/lib/collections";

// A tile with a count, or with a line of its own for a view that is not a pile of cards. One
// shape for every folder, the three that are always there and the ones you made, so the page
// is one grid whatever the screen.
function FolderCard({ href, icon, name, count, detail }: { href: string; icon: FC<{ className?: string }>; name: string; count?: number; detail?: string }) {
    return (
        <Link
            href={href}
            className="flex pressable flex-col gap-3 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary outline-focus-ring transition-[color,background-color,box-shadow] ring-inset hover:bg-secondary focus-visible:outline-2"
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
                <Button iconLeading={Plus} size="md" aria-label="New folder" className="sm:hidden" />
            </FolderDialog>
            <FolderDialog mode="create" facets={facets}>
                <Button iconLeading={Plus} size="md" className="max-sm:hidden">
                    New folder
                </Button>
            </FolderDialog>
        </>
    );
}

export function CollectionsGrid({
    collections,
    ownedCount,
    favoritesCount,
    facets,
}: {
    collections: CollectionSummary[];
    ownedCount: number;
    favoritesCount: number;
    facets: Facets;
}) {
    const hasCollections = collections.length > 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* One grid: the three folders that are always there (every card, the favorites, the Pokédex; none a
                folder in the data, all three one to the eye), then the ones you made. On desktop the sidebar is
                this list. */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <FolderCard href="/dashboard/cards" icon={Rows01} name="All cards" count={ownedCount} />
                <FolderCard href="/dashboard/favorites" icon={Star01} name="Favorites" count={favoritesCount} />
                <FolderCard href="/dashboard/pokedex" icon={Folder} name="Pokédex" detail="Cards by Pokémon" />
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

            {hasCollections ? null : (
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
