// The outlines a page shows while it fetches, one per shape of page. Each keeps the real layout's
// grid and ratios, so nothing moves when the content lands. Every loading.tsx under the dashboard
// composes these. The shell (sidebar, tab bar) streams before any of them, with the two slots below
// standing in for what its own reads bring: the folders you made and the account card.

const Block = ({ className }: { className: string }) => <div className={`rounded-md bg-secondary ${className}`} />;

export function SkeletonFrame({ children }: { children: React.ReactNode }) {
    return (
        <output aria-live="polite" className="flex flex-1 flex-col gap-6 motion-safe:animate-pulse">
            <span className="sr-only">Loading…</span>
            <div className="flex flex-col gap-2" aria-hidden="true">
                <Block className="h-7 w-40" />
                <Block className="h-5 w-64" />
            </div>
            <div className="contents" aria-hidden="true">
                {children}
            </div>
        </output>
    );
}

/** A card list: the tiles' own ratio, in the grid's own columns. */
export function CardsSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 p-2">
                    <div className="aspect-[63/88] w-full rounded-lg bg-secondary" />
                    <Block className="h-4 w-3/4" />
                    <Block className="h-3 w-1/2" />
                </div>
            ))}
        </div>
    );
}

/** Home: the row of stat tiles and the chart's box. */
export function HomeSkeleton() {
    return (
        <>
            <div className="flex flex-col gap-x-6 gap-y-5 md:flex-row md:flex-wrap">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex flex-1 flex-col gap-5 rounded-xl px-4 py-5 shadow-border md:min-w-[240px] md:px-5">
                        <Block className="size-12 rounded-lg" />
                        <div className="flex flex-col gap-2">
                            <Block className="h-4 w-20" />
                            <Block className="h-8 w-28" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-4 rounded-xl px-4 py-5 shadow-border md:px-5">
                <Block className="h-4 w-48" />
                <Block className="h-56 w-full" />
            </div>
        </>
    );
}

/** The Pokédex: the bar under the count, then the small square slots in their own columns. */
export function DexSkeleton() {
    return (
        <>
            <Block className="-mt-4 h-2 max-w-md" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                {Array.from({ length: 48 }, (_, i) => (
                    <div key={i} className="aspect-3/4 rounded-md bg-secondary" />
                ))}
            </div>
        </>
    );
}

/** Folders: the tiles of the collections page. */
export function FoldersSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
                <Block key={i} className="h-24 rounded-xl" />
            ))}
        </div>
    );
}

/** The sets shelf: a series heading, then rows of logo, name and bar. */
export function SetsSkeleton() {
    return (
        <>
            <Block className="-mt-4 h-2 max-w-md" />
            {Array.from({ length: 2 }, (_, s) => (
                <div key={s} className="flex flex-col gap-3">
                    <Block className="h-5 w-32" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }, (_, i) => (
                            <Block key={i} className="h-20 rounded-xl" />
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}

/** One set: the bar under the count, then card tiles in the set grid's columns. */
export function SetSkeleton() {
    return (
        <>
            <Block className="-mt-4 h-2 max-w-md" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {Array.from({ length: 40 }, (_, i) => (
                    <div key={i} className="aspect-[63/88] rounded-md bg-secondary" />
                ))}
            </div>
        </>
    );
}

/** The sidebar's folder rows, two of them, at a nav item's height and padding. */
export function FolderRowsSkeleton() {
    return (
        <div className="flex flex-col px-4 motion-safe:animate-pulse" aria-hidden="true">
            {[0, 1].map((i) => (
                <div key={i} className="flex h-9 items-center gap-2 p-2">
                    <Block className="size-5 shrink-0 rounded-sm" />
                    <Block className={i === 0 ? "h-3.5 w-24" : "h-3.5 w-16"} />
                </div>
            ))}
        </div>
    );
}

/** The account card at the sidebar's foot: a circle and two lines, in the card's own padding. */
export function AccountCardSkeleton() {
    return (
        <div className="flex items-center gap-3 p-2 motion-safe:animate-pulse" aria-hidden="true">
            <div className="size-10 shrink-0 rounded-full bg-secondary" />
            <div className="flex flex-col gap-1.5">
                <Block className="h-3.5 w-24" />
                <Block className="h-3 w-32" />
            </div>
        </div>
    );
}

/** One line of text still on its way: the count and value under a folder's title. */
export function LineSkeleton({ className = "h-4 w-40" }: { className?: string }) {
    return <span aria-hidden="true" className={`inline-block rounded-md bg-secondary align-middle motion-safe:animate-pulse ${className}`} />;
}
