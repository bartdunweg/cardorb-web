import type { ReactNode } from "react";
import { MobileTopRow } from "@/components/app/mobile-top-row";
import { PageHeader } from "@/components/app/page-header";
import { ListRow } from "@/components/app/skeleton-row";
import { GRID_COLUMNS } from "@/lib/cards-view";

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
                    <div className="aspect-card w-full rounded-card bg-quaternary" />
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
    lines = 1,
}: {
    title?: string;
    subtitle?: string;
    back?: { href: string; label: string };
    tiles?: number;
    /** The count's lines: two on the Pokédex. */
    lines?: 1 | 2;
}) {
    return (
        <SkeletonFrame>
            <PageHeader
                title={title ?? " "}
                subtitle={
                    <>
                        {subtitle ? <span className="block">{subtitle}</span> : null}
                        {Array.from({ length: lines }, (_, i) => (
                            <span key={i} className="block">
                                <Line className="h-5 w-40" />
                            </span>
                        ))}
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

/**
 * A page of panels rather than a grid: Settings and You, which both read the profile before they
 * can draw anything. Their titles are known without the read — "Settings" is always "Settings" —
 * so the frame carries the real heading and leaves only the panels outlined.
 */
export function PanelsSkeleton({ title, subtitle, panels = 3 }: { title: string; subtitle?: string; panels?: number }) {
    return (
        <SkeletonFrame>
            <PageHeader title={title} subtitle={subtitle ?? <Line className="h-5 w-56" />} back={{ href: "/dashboard", label: "Home" }} />
            <div className="flex flex-col gap-6">
                {Array.from({ length: panels }, (_, i) => (
                    <Outline key={i} className="h-40 w-full">
                        <span className="sr-only" />
                    </Outline>
                ))}
            </div>
        </SkeletonFrame>
    );
}

/** Home: the title, the value section's outline, then the four stat tiles in their grid. */
export function HomeSkeleton() {
    return (
        <SkeletonFrame>
            <PageHeader title="Home" titleOnPhone={false} />
            <ValueHeroOutline />
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
        </SkeletonFrame>
    );
}

/** The value section before its numbers: the label with its real words, then the number, the change line, the chart's box and the periods. */
export function ValueHeroOutline() {
    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-tertiary">Collection value</h2>
                <Outline className="flex flex-col gap-1">
                    <p className="text-display-md sm:text-display-lg">
                        <Line className="h-[0.8em] w-48" />
                    </p>
                    <p className="text-sm">
                        <Line className="h-4 w-40" />
                    </p>
                </Outline>
            </div>
            <Outline>
                <Block className="h-[200px] w-full" />
            </Outline>
            <div className="flex justify-center gap-1" aria-hidden="true">
                {["7D", "1M", "3M", "6M", "Max"].map((p) => (
                    <span key={p} className="rounded-full px-3 py-1.5 text-sm font-semibold text-tertiary">
                        {p}
                    </span>
                ))}
            </div>
        </section>
    );
}

/** Collection: the title and its line, then the folder tiles in their grid, each an icon square and two lines. */
export function FoldersSkeleton() {
    return (
        <SkeletonFrame>
            <PageHeader title="Collection" />
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
                    <div key={i} className="aspect-card rounded-card bg-quaternary" />
                ))}
            </Outline>
        </SkeletonFrame>
    );
}
