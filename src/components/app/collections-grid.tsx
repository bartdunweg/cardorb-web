"use client";

import type { FC } from "react";
import { Folder, FolderPlus, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderDialog } from "@/components/app/folder-dialog";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { CollectionSummary } from "@/lib/collections";
import { cx } from "@/utils/cx";

// On a phone a row: the icon, the name, the count at the end as a number alone (the sidebar's rows
// on desktop have it the same way), and a line between rows — a list, not a stack of cards (Bart's
// call). From sm a stacked tile, three or four to a row, with "12 cards" under the name. One
// component for every binder, the two that are always there and the ones you made. How a binder
// was filled is not said here: by hand or by rule, it is a binder with cards in it (Bart's call).
// The Pokédex too: a binder with a rule, counted like one. `count` is null only when a count
// could not be read, and the tile goes without.
function FolderCard({ href, icon, name, count }: { href: string; icon: FC<{ className?: string }>; name: string; count: number | null }) {
    const counted = count === null ? null : `${count} card${count === 1 ? "" : "s"}`;
    return (
        <Link
            href={href}
            className={cx(
                "flex pressable items-center gap-3 outline-focus-ring transition-[color,background-color,box-shadow] focus-visible:outline-2",
                // The row: no surface of its own, the page's, with the divider the list draws between rows.
                "max-sm:-mx-1 max-sm:rounded-lg max-sm:px-1 max-sm:py-3 max-sm:hover:bg-secondary",
                // The tile.
                "sm:flex-col sm:items-start sm:rounded-xl sm:bg-primary sm:p-4 sm:shadow-lift-xs sm:ring-1 sm:ring-primary sm:ring-inset sm:hover:bg-secondary",
            )}
        >
            <FeaturedIcon color="gray" theme="modern-neue" size="lg" icon={icon} className="shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-primary">{name}</span>
                {/* Under the name on a tile; at the row's end on a phone. */}
                {counted ? <span className="text-sm text-tertiary max-sm:hidden">{counted}</span> : null}
            </div>
            {count !== null ? (
                <span className="shrink-0 text-sm text-tertiary tabular-nums sm:hidden">
                    {count}
                    <span className="sr-only"> card{count === 1 ? "" : "s"}</span>
                </span>
            ) : null}
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

export function CollectionsGrid({
    collections,
    favoritesCount,
    pokedexCount,
}: {
    collections: CollectionSummary[];
    favoritesCount: number;
    pokedexCount: number | null;
}) {
    const hasCollections = collections.length > 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* One grid: the two folders that are always there (the favorites, the Pokédex; neither a folder in
                the data, both one to the eye), then the ones you made. All cards is not here: it is a tab of its
                own, beside Home. On desktop the sidebar's Collections section is this list. */}
            <div className="grid grid-cols-1 max-sm:divide-y max-sm:divide-secondary sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {/* The tiles arrive as the card grids do, in a wrapper: the link owns a transition of its own. */}
                <div className="arrive">
                    <FolderCard href="/dashboard/favorites" icon={Star01} name="Favorites" count={favoritesCount} />
                </div>
                <div className="arrive" style={{ "--arrive-delay": "20ms" } as React.CSSProperties}>
                    {/* A folder like the ones beside it, with a count like theirs; see the note in app-sidebar.tsx. */}
                    <FolderCard href="/dashboard/pokedex" icon={Folder} name="Pokédex" count={pokedexCount} />
                </div>
                {collections.map((c, i) => (
                    <div key={c.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i + 2, 8) * 20}ms` } as React.CSSProperties}>
                        <FolderCard
                            href={`/dashboard/collections/${c.id}`}
                            // However it was filled, it is a folder with cards in it.
                            icon={Folder}
                            name={c.name}
                            count={c.count}
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
