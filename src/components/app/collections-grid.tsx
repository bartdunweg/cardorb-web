"use client";

import type { FC } from "react";
import { Folder, FolderPlus, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderDialog } from "@/components/app/folder-dialog";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { CollectionSummary } from "@/lib/collections";

// A tile with a count, or with a line of its own for a view that is not a pile of cards. One
// shape for every folder, the two that are always there and the ones you made, so the page
// is one grid whatever the screen.
function FolderCard({ href, icon, name, count, detail }: { href: string; icon: FC<{ className?: string }>; name: string; count?: number; detail?: string }) {
    return (
        <Link
            href={href}
            // One to a row on a phone, the icon beside the words; a stacked tile from sm, three or four to a row.
            className="flex pressable items-center gap-3 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary outline-focus-ring transition-[color,background-color,box-shadow] ring-inset hover:bg-secondary focus-visible:outline-2 sm:flex-col sm:items-start"
        >
            <FeaturedIcon color="gray" theme="modern-neue" size="lg" icon={icon} className="shrink-0" />
            <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-primary">{name}</span>
                <span className="text-sm text-tertiary">{detail ?? `${count} card${count === 1 ? "" : "s"}`}</span>
            </div>
        </Link>
    );
}

// Beside the page title from lg, the words; `compact` is the plus alone for the phone's bar, the size
// of Back beside it. Both open the dialog below.
// No facets handed in: the dialog reads them itself when it opens (folder-dialog.tsx), so the page waits for nothing.
export function NewCollectionButton({ compact }: { compact?: boolean }) {
    return (
        <FolderDialog mode="create">
            {/* A folder, not a plus: Add card stands beside it with the plus, and two pluses in one bar
                were two guesses. Secondary for the same reason — adding a card is the app's main action. */}
            {compact ? (
                <Button iconLeading={FolderPlus} color="secondary" size="lg" aria-label="New binder" />
            ) : (
                <Button iconLeading={FolderPlus} color="secondary" size="md">
                    New binder
                </Button>
            )}
        </FolderDialog>
    );
}

export function CollectionsGrid({ collections, favoritesCount }: { collections: CollectionSummary[]; favoritesCount: number }) {
    const hasCollections = collections.length > 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* One grid: the two folders that are always there (the favorites, the Pokédex; neither a folder in
                the data, both one to the eye), then the ones you made. All cards is not here: it is a tab of its
                own, beside Home. On desktop the sidebar's Collections section is this list. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {/* The tiles arrive as the card grids do, in a wrapper: the link owns a transition of its own. */}
                <div className="arrive">
                    <FolderCard href="/dashboard/favorites" icon={Star01} name="Favorites" count={favoritesCount} />
                </div>
                <div className="arrive" style={{ "--arrive-delay": "20ms" } as React.CSSProperties}>
                    {/* A folder like the ones beside it; see the note in app-sidebar.tsx. */}
                    <FolderCard href="/dashboard/pokedex" icon={Folder} name="Pokédex" detail="Cards by Pokémon" />
                </div>
                {collections.map((c, i) => (
                    <div key={c.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i + 2, 8) * 20}ms` } as React.CSSProperties}>
                        <FolderCard
                            href={`/dashboard/collections/${c.id}`}
                            // However it was filled, it is a folder with cards in it.
                            icon={Folder}
                            name={c.name}
                            count={c.count}
                            detail={c.kind === "rule" ? `${c.count} card${c.count === 1 ? "" : "s"} · by rule` : undefined}
                        />
                    </div>
                ))}
            </div>

            {hasCollections ? null : (
                // On a phone the hub above is the page and the plus beside the title is the way in; the
                // empty state would only push the tab bar's worth of nothing under two tiles.
                <div className="hidden lg:contents">
                    <AppEmptyState icon="folder" title="No binders yet" description="Group your cards into binders you can jump to from the sidebar.">
                        <FolderDialog mode="create">
                            <Button iconLeading={FolderPlus}>New binder</Button>
                        </FolderDialog>
                    </AppEmptyState>
                </div>
            )}
        </div>
    );
}
