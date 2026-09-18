import { type ReactNode, Suspense } from "react";
import { BarSearchButton } from "@/components/app/bar-search-button";
import { BarViewMenu } from "@/components/app/bar-view-menu";
import { BinderBody, type BinderBodyProps } from "@/components/app/binder-body";
import { ListTotalsProvider, LiveDatapoints } from "@/components/app/list-totals";
import { PageHeader } from "@/components/app/page-header";
import type { Datapoints } from "@/lib/binder-datapoints";
import { rememberedView } from "@/lib/list-memory-server";

// Every binder page, top to bottom: the title, what it holds (count and value), the binder's
// actions where it has any, then the row and the list. One shape, so All cards, a binder of
// yours, the favorites and the wishlist read the same.
//
// The title, the actions and the row are drawn at once. The count and the value are a promise
// the page did not wait for: they come from the same read as the first batch of cards, and
// take their place under the title when it lands.
export async function BinderPage({
    title,
    phoneTitle,
    subtitle,
    datapointLines = 1,
    back,
    datapoints,
    actions,
    barActions,
    settings,
    add,
    views,
    children,
    ...body
}: BinderBodyProps & {
    title: string;
    /** The title below `lg` where it differs (PageHeader). */
    phoneTitle?: string;
    /** A sentence under the title, above the count, where the title alone does not say what the list is. */
    subtitle?: string;
    /** How many lines the count takes: two on a Pokédex ("544 of 1,025 Pokémon", then the count). */
    datapointLines?: 1 | 2;
    back?: { href: string; label: string };
    /** The count and value under the title. Left out on Collection, whose value Home already leads with. */
    datapoints?: Datapoints | Promise<Datapoints>;
    actions?: ReactNode;
    /** A phone's settings button, in the bar across from Back; see PageHeader. */
    barActions?: ReactNode;
    /**
     * A list's own two actions, drawn twice: beside the title from lg (words), and in the phone's bar
     * across from Back (icons, `compact`). One shape for All cards, Favorites, the wishlist and the
     * Pokédex, so the pair sits in the same place on every list. Given, they take the place of
     * `actions` and `barActions`; those are not drawn beside them.
     */
    settings?: (compact: boolean) => ReactNode;
    add?: (compact: boolean) => ReactNode;
    /**
     * Sibling lists this page switches between (Collection | Wishlist), on a phone alone: one tab there holds
     * both, where from lg the sidebar lists each as a page of its own (Bart's call, 2026-09-18).
     */
    views?: ReactNode;
    /** Under the data points: a rule's chips, a progress bar. */
    children?: ReactNode;
}) {
    /* On a phone View sits in the bar beside the dots, as the list's own row keeps only the filters;
       started from what the list starts from, so the two agree before either is touched. A public
       profile has no bar and keeps View in its row. */
    const remembered = await rememberedView(body.basePath);
    const view = body.readOnly ? null : (
        <>
            {/* The search beside View and the dots: the field comes out above the filters on a press. */}
            <BarSearchButton label={body.searchLabel ?? `Search in ${title}`} />
            <BarViewMenu
                initialView={remembered.view}
                initialSize={remembered.size}
                initialGroup={remembered.group}
                layouts={!body.pokedex}
                grouped={!body.pokedex && body.query.sortKey === "set"}
            />
        </>
    );
    return (
        // The count under the title follows the presses on the tiles below it (list-totals.tsx).
        <ListTotalsProvider>
            <div className="flex flex-1 flex-col gap-6">
                <PageHeader
                    title={title}
                    phoneTitle={phoneTitle}
                    subtitle={
                        subtitle || datapoints ? (
                            <>
                                {subtitle ? <span className="block">{subtitle}</span> : null}
                                {datapoints ? (
                                    <Suspense fallback={<CountOutline lines={datapointLines} />}>
                                        {/* The outline keeps the line's height, so the row and the cards do not move when the numbers land. */}
                                        <DatapointsText datapoints={datapoints} />
                                    </Suspense>
                                ) : null}
                            </>
                        ) : undefined
                    }
                    back={back}
                    actions={
                        settings || add ? (
                            <div className="flex items-center gap-3 max-lg:hidden">
                                {settings?.(false)}
                                {add?.(false)}
                            </div>
                        ) : (
                            actions
                        )
                    }
                    barActions={
                        settings || add ? (
                            <>
                                {view}
                                {settings?.(true)}
                                {add?.(true)}
                            </>
                        ) : (
                            <>
                                {view}
                                {barActions}
                            </>
                        )
                    }
                >
                    {children}
                </PageHeader>
                {/* The field says which list it searches: "Search in Wishlist", "Search in Kanto". */}
                <BinderBody searchLabel={`Search in ${title}`} {...body} views={views} />
            </div>
        </ListTotalsProvider>
    );
}

async function DatapointsText({ datapoints }: { datapoints: Datapoints | Promise<Datapoints> }) {
    return <LiveDatapoints datapoints={await datapoints} />;
}

// What stands where the numbers will: a block per line, the line's height, so nothing under it moves.
function CountOutline({ lines }: { lines: 1 | 2 }) {
    return (
        <>
            {Array.from({ length: lines }, (_, i) => (
                <span key={i} className="block">
                    <span className="inline-block h-5 w-40 rounded-md bg-skeleton align-middle motion-safe:animate-pulse" />
                </span>
            ))}
        </>
    );
}
