// Shown by Next while a dashboard page is still fetching, so the shell — sidebar, header — stands
// at once and the cards land in this outline. The boxes have the card's own ratio, so nothing
// moves when the real grid replaces them.
export default function DashboardLoading() {
    return (
        <output aria-live="polite" className="flex flex-1 flex-col gap-6 motion-safe:animate-pulse">
            <span className="sr-only">Loading…</span>
            <div className="flex flex-col gap-2" aria-hidden="true">
                <div className="h-7 w-40 rounded-md bg-secondary" />
                <div className="h-5 w-64 rounded-md bg-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="flex flex-col gap-2 p-2">
                        <div className="aspect-[63/88] w-full rounded-lg bg-secondary" />
                        <div className="h-4 w-3/4 rounded bg-secondary" />
                        <div className="h-3 w-1/2 rounded bg-secondary" />
                    </div>
                ))}
            </div>
        </output>
    );
}
