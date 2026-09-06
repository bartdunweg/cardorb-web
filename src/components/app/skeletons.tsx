import type { ReactNode } from "react";
import { GRID_COLUMNS } from "@/components/app/cards-grid";
import { MobileTopRow } from "@/components/app/mobile-top-row";
import { PageHeader } from "@/components/app/page-header";
import { ListRow } from "@/components/app/skeleton-row";

// What a page shows while it fetches: the page's own frame, with outlines only where the data
// will be. The title, the subtitle, Back and the row are the real components with the real words,
// so nothing moves when the content lands; the count line, the tiles and the cards are blocks in
// the real grid's columns. Every loading.tsx under the dashboard composes these. The shell (sidebar,
// tab bar) streams before any of them.

// A shade under the page: a block the page's own colour would be no outline at all.
const Block = ({ className }: { className: string }) => <div className={`rounded-md bg-quaternary ${className}`} />;

// The same block where a line of text will be: inside a <p>, so a span.
const Line = ({ className }: { className: string }) => <span className={`inline-block rounded-md bg-quaternary align-middle ${className}`} />;

/** The outlines: hidden from a screen reader (the frame around them says "Loading…"), pulsing. */
function Outline({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div aria-hidden="true" className={`motion-safe:animate-pulse ${className}`}>
            {children}
        </div>
    );
}

export function SkeletonFrame({ children }: { children: ReactNode }) {
    return (
        <output aria-live="polite" className="flex flex-1 flex-col gap-6">
            <span className="sr-only">Loading…</span>
            {children}
        </output>
    );
}

/** A card list: the tiles' own ratio, in the grid's own columns, without the surface a tile no longer has. */
export function CardsSkeleton({ count = 12 }: { count?: number }) {
    return (
        <Outline className={`grid gap-4 ${GRID_COLUMNS.md}`}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                    <div className="aspect-card w-full rounded-lg bg-quaternary" />
                    <Block className="h-4 w-3/4" />
                    <Block className="h-3 w-1/2" />
                </div>
            ))}
        </Outline>
    );
}

/**
 * A list page: the title, its count line as a block, Back where the page has one, then the row and
 * the cards. `title` absent (a folder, a set: the name comes with the data) leaves the title's
 * line empty rather than guessing a word that would then change.
 */
export function ListSkeleton({
    title,
    subtitle,
    back,
    tiles = 12,
}: {
    title?: string;
    subtitle?: string;
    back?: { href: string; label: string };
    tiles?: number;
}) {
    return (
        <SkeletonFrame>
            <PageHeader
                title={title ?? " "}
                subtitle={
                    <>
                        {subtitle ? <span className="block">{subtitle}</span> : null}
                        <Line className="h-5 w-40" />
                    </>
                }
                back={back}
            />
            <div className="flex flex-col gap-4">
                <ListRow />
                <CardsSkeleton count={tiles} />
            </div>
        </SkeletonFrame>
    );
}

/** Home: the title, the four stat tiles in their grid, and the chart's box. */
export function HomeSkeleton() {
    return (
        <SkeletonFrame>
            <PageHeader title="Home" subtitle="An overview of your collection." />
            <Outline className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="rounded-xl bg-primary shadow-lift-xs ring-1 ring-primary ring-inset">
                        <div className="flex flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-5 md:gap-5 md:px-5">
                            <div className="flex flex-col gap-2">
                                <Block className="h-5 w-20" />
                                <Block className="h-8 w-24 sm:h-9" />
                            </div>
                        </div>
                    </div>
                ))}
            </Outline>
            <section className="flex flex-col gap-4 rounded-xl bg-primary px-4 py-5 shadow-lift-xs ring-1 ring-primary ring-inset md:px-5">
                <div className="flex flex-col gap-1">
                    <h2 className="text-md font-semibold text-primary">Collection value over time</h2>
                    <p className="text-xs text-quaternary">One reading a night, at Cardmarket&apos;s prices of that day.</p>
                </div>
                <Outline>
                    <Block className="h-56 w-full" />
                </Outline>
            </section>
        </SkeletonFrame>
    );
}

/** Collection: the title and its line, then the folder tiles in their grid, each an icon square and two lines. */
export function FoldersSkeleton() {
    return (
        <SkeletonFrame>
            <PageHeader title="Collection" subtitle="Group your cards the way you like." />
            <Outline className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary ring-inset sm:flex-col sm:items-start"
                    >
                        <Block className="size-12 shrink-0 rounded-lg" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <Block className="h-4 w-24" />
                            <Block className="h-3.5 w-16" />
                        </div>
                    </div>
                ))}
            </Outline>
        </SkeletonFrame>
    );
}

/** Browse: the search at the top on a phone, then a series heading and rows of logo, name and bar in the shelf's grid. */
export function SetsSkeleton() {
    return (
        <SkeletonFrame>
            <PageHeader title="Browse" above={<MobileTopRow />} titleOnPhone={false} />
            <SetsOutline />
        </SkeletonFrame>
    );
}

/** The shelf's rows alone, under a title the page has already drawn. */
export function SetsOutline() {
    return (
        <>
            {Array.from({ length: 2 }, (_, s) => (
                <Outline key={s} className="flex flex-col gap-3">
                    <Block className="h-6 w-40" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="flex items-center gap-4 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary ring-inset">
                                <Block className="size-12 shrink-0" />
                                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <Block className="h-4 w-32" />
                                        <Block className="h-4 w-14" />
                                    </div>
                                    <Block className="h-2 w-full rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Outline>
            ))}
        </>
    );
}

/** One set: Back to Browse, the name's line and the count, then card tiles in the set grid's columns. */
export function SetSkeleton() {
    return (
        <SkeletonFrame>
            <PageHeader title={" "} subtitle={<Line className="h-5 w-40" />} back={{ href: "/dashboard/sets", label: "Browse" }} />
            <Outline className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {Array.from({ length: 40 }, (_, i) => (
                    <div key={i} className="aspect-card rounded-md bg-quaternary" />
                ))}
            </Outline>
        </SkeletonFrame>
    );
}
