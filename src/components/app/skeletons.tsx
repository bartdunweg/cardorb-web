// The outlines a page shows while it fetches, one per shape of page. Each keeps the real layout's
// grid and ratios, so nothing moves when the content lands. Every loading.tsx under the dashboard
// composes these. The shell (sidebar, tab bar) streams before any of them, with the two slots below
// standing in for what its own reads bring: the folders you made and the account card.

// A shade under the page (neutral-100): a block the page's own colour would be no outline at all.
const Block = ({ className }: { className: string }) => <div className={`rounded-md bg-quaternary ${className}`} />;

export function SkeletonFrame({ children }: { children: React.ReactNode }) {
    return (
        <output aria-live="polite" className="flex flex-1 flex-col gap-6 motion-safe:animate-pulse">
            <span className="sr-only">Loading…</span>
            {/* No stand-in for the title or the row: those come with the page itself, a moment later; only
                the cards, which come after that, are worth an outline. */}
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
                    <div className="aspect-[63/88] w-full rounded-lg bg-quaternary" />
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
                    <div key={i} className="flex flex-1 flex-col gap-5 rounded-xl px-4 py-5 ring-1 ring-primary ring-inset md:min-w-[240px] md:px-5">
                        <Block className="size-12 rounded-lg" />
                        <div className="flex flex-col gap-2">
                            <Block className="h-4 w-20" />
                            <Block className="h-8 w-28" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-4 rounded-xl px-4 py-5 ring-1 ring-primary ring-inset md:px-5">
                <Block className="h-4 w-48" />
                <Block className="h-56 w-full" />
            </div>
        </>
    );
}

/** The Pokédex: the same tiles as a list of cards. */
export function DexSkeleton() {
    return <CardsSkeleton />;
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
                    <div key={i} className="aspect-[63/88] rounded-md bg-quaternary" />
                ))}
            </div>
        </>
    );
}
