"use client";

import type { FC } from "react";
import { Folder, Plus, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BinderDialog } from "@/components/app/binder-dialog";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { BinderSummary } from "@/lib/binders";
import { formatCount } from "@/lib/format";
import { cx } from "@/utils/cx";

// On a phone a row: the icon, the name, the count at the end as a number alone (the sidebar's rows
// on desktop have it the same way), and a line between rows from the name on: a list, not a stack of cards (Bart's
// call). From sm a stacked tile, three or four to a row, with "12 cards" under the name. One
// component for every binder, Favorites and the ones you made. How a binder was filled is not said
// here: by hand or by rule, it is a binder with cards in it (Bart's call). A binder shown as a
// Pokédex too, which is what the Pokédex is now. `count` is null only when a count could not be
// read, and the tile goes without.
function BinderCard({ href, icon, name, count }: { href: string; icon: FC<{ className?: string }>; name: string; count: number | null }) {
    const counted = count === null ? null : `${formatCount(count)} card${count === 1 ? "" : "s"}`;
    return (
        <Link
            href={href}
            // One level in: the binder's page comes from the right (page-transition.tsx).
            transitionTypes={["nav-forward"]}
            className={cx(
                "flex pressable items-center gap-3 outline-focus-ring focus-visible:outline-2",
                // The row: no surface of its own, the page's. The line under it starts where the name does, not
                // under the icon, as an iOS list insets its separators (Bart's call, 2026-09-18): 4 px of the
                // row's own inset, the 48 px icon and the 12 px gap. The list takes it off the last row.
                "max-sm:relative max-sm:-mx-1 max-sm:rounded-lg max-sm:px-1 max-sm:py-3 max-sm:hover:bg-alpha-black/4",
                "max-sm:after:absolute max-sm:after:right-1 max-sm:after:bottom-0 max-sm:after:left-16 max-sm:after:h-px max-sm:after:bg-border-secondary",
                // The tile.
                "sm:flex-col sm:items-start sm:rounded-xl sm:bg-page sm:p-4 sm:shadow-lift-xs sm:ring-1 sm:ring-primary sm:ring-inset sm:hover:bg-alpha-black/4",
            )}
        >
            {/* The kit's flat icon, a grey disc with no rim or shadow: the lifted one read as a button on every row (Bart's call, 2026-09-18). */}
            <FeaturedIcon color="gray" theme="light" size="lg" icon={icon} className="shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-primary">{name}</span>
                {/* Under the name on a tile; at the row's end on a phone. */}
                {counted ? <span className="text-sm text-tertiary max-sm:hidden">{counted}</span> : null}
            </div>
            {count !== null ? (
                <span className="shrink-0 text-sm text-tertiary tabular-nums sm:hidden">
                    {formatCount(count)}
                    <span className="sr-only"> card{count === 1 ? "" : "s"}</span>
                </span>
            ) : null}
        </Link>
    );
}

// Beside the page title from lg, the words; `compact` is the plus alone for the phone's bar, the size
// of Back beside it. Both open the dialog below.
// No facets handed in: the dialog reads them itself when it opens (binder-dialog.tsx), so the page waits for nothing.
export function NewBinderButton({ compact }: { compact?: boolean }) {
    return (
        <BinderDialog mode="create">
            {/* The plus, now Add card no longer stands beside it with one of its own (the search opens
                that palette). Secondary: the round search button is the one black button on a phone
                (Bart's call, 2026-09-18). */}
            {compact ? (
                <Button iconLeading={Plus} color="secondary" size="lg" aria-label="New binder" />
            ) : (
                <Button iconLeading={Plus} color="secondary" size="md">
                    New binder
                </Button>
            )}
        </BinderDialog>
    );
}

export function BindersGrid({ binders, favoritesCount }: { binders: BinderSummary[]; favoritesCount: number }) {
    const hasBinders = binders.length > 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* One grid: Favorites, the one that is always there (not a binder in the data, one to the eye),
                then the ones you made, the Pokédex among them. All cards is not here: it is a tab of its own,
                beside Home. On desktop the sidebar's Binders section is this list. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 max-sm:[&>:last-child>a]:after:hidden">
                {/* The tiles arrive as the card grids do, in a wrapper: the link owns a transition of its own. */}
                <div className="arrive">
                    <BinderCard href="/dashboard/favorites" icon={Star01} name="Favorites" count={favoritesCount} />
                </div>
                {binders.map((c, i) => (
                    <div key={c.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i + 1, 8) * 20}ms` } as React.CSSProperties}>
                        <BinderCard
                            href={`/dashboard/collections/${c.id}`}
                            // However it was filled, it is a binder with cards in it.
                            icon={Folder}
                            name={c.name}
                            count={c.count}
                        />
                    </div>
                ))}
            </div>

            {hasBinders ? null : (
                // On a phone the hub above is the page and the plus beside the title is the way in; the
                // empty state would only push the tab bar's worth of nothing under two tiles.
                <div className="hidden lg:contents">
                    <AppEmptyState icon="folder" title="No binders yet" description="Group your cards into binders you can jump to from the sidebar.">
                        <BinderDialog mode="create">
                            <Button iconLeading={Plus}>New binder</Button>
                        </BinderDialog>
                    </AppEmptyState>
                </div>
            )}
        </div>
    );
}
