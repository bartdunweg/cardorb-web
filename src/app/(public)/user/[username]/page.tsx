import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsFilters } from "@/components/app/cards-filters";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSearch } from "@/components/app/cards-search";
import { CardsSort } from "@/components/app/cards-sort";
import { PublicCardsView } from "@/components/app/public-cards-view";
import { PublicTopBar } from "@/components/app/public-top-bar";
import { Avatar } from "@/components/base/avatar/avatar";
import { PUBLIC_SORT_OPTIONS, listHref, readPublicListQuery } from "@/lib/list-query";
import { getViewer } from "@/lib/profile";
import { PUBLIC_PAGE_SIZE, getPublicCards, getPublicProfile } from "@/lib/public-profile";
import { RouteProvider } from "@/providers/router-provider";

type Params = { params: Promise<{ username: string }>; searchParams: Promise<{ page?: string; q?: string; sort?: string; set?: string; rarity?: string }> };

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
    const { username } = await params;
    const { page } = readPublicListQuery(await searchParams);
    const base = `/user/${encodeURIComponent(username)}`;
    // Each page names itself: a shared or indexed second page must not collapse onto the first.
    // A search is not a page of its own: its canonical is the list it searched.
    const canonical = page > 1 ? `${base}?page=${page}` : base;
    const profile = await getPublicProfile(decodeURIComponent(username));
    if (!profile) return { title: "Collection not found", robots: { index: false } };
    const name = profile.display_name || profile.username || "Collection";
    const description = `${name}'s Pokémon card collection on Cardorb.`;
    return {
        title: name,
        description,
        alternates: { canonical },
        openGraph: { title: `${name}'s collection`, description, url: canonical, images: ["/opengraph-image"] },
    };
}

export default async function PublicProfilePage({ params, searchParams }: Params) {
    const { username } = await params;
    const profile = await getPublicProfile(decodeURIComponent(username));
    if (!profile) notFound();

    const query = readPublicListQuery(await searchParams);
    const { page, q } = query;
    const narrowed = Boolean(q || query.set || query.rarity);
    const [{ cards, total, sets, facets }, viewer] = await Promise.all([getPublicCards(decodeURIComponent(username), query), getViewer()]);
    const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
    const base = `/user/${encodeURIComponent(username)}`;
    const name = profile.display_name || profile.username || "Collection";
    // The handle sits under a display name, as a profile page does; with no display name it is the name.
    const handle = profile.display_name && profile.username ? `@${profile.username}` : null;
    // With a search or a filter on, the count is what matched; the set count still spans the whole collection.
    const counts = [
        narrowed ? `${total.toLocaleString("en-US")} match${total === 1 ? "" : "es"}` : `${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"}`,
        `${sets.toLocaleString("en-US")} set${sets === 1 ? "" : "s"}`,
    ].join(" · ");

    return (
        <div className="flex min-h-dvh flex-col bg-primary">
            {/* The menu's items are react-aria links; the provider hands them the app router. */}
            <PublicTopBar
                menu={
                    viewer ? (
                        <RouteProvider>
                            <AccountMenu account={viewer} compact />
                        </RouteProvider>
                    ) : undefined
                }
            />

            <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex items-center gap-4">
                    <Avatar size="xl" src={profile.avatar_url ?? undefined} alt={name} />
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-xs font-semibold text-primary">{name}</h1>
                        {handle ? <p className="text-md text-tertiary">{handle}</p> : null}
                        <p className="text-sm font-medium text-secondary tabular-nums">{counts}</p>
                    </div>
                </div>

                {cards.length === 0 && !narrowed ? (
                    <AppEmptyState icon="folder" title="This collection is empty" description="Nothing has been added to it yet" />
                ) : (
                    <div className="flex flex-1 flex-col gap-4">
                        {/* One row: search, the two filters, the sort. It wraps on a narrow screen. */}
                        <div className="flex flex-wrap items-center gap-2">
                            <CardsSearch
                                initialValue={q ?? ""}
                                label="Search this collection"
                                placeholder="Search this collection"
                                className="w-full sm:w-72"
                            />
                            <CardsFilters query={query} facets={facets} />
                            <CardsSort query={query} options={PUBLIC_SORT_OPTIONS} />
                        </div>
                        {cards.length === 0 ? (
                            <AppEmptyState
                                icon="search"
                                title="No cards found"
                                description={
                                    q
                                        ? `No cards match “${q}”. Try a different name or set.`
                                        : "Nothing in that set or rarity. Clear a filter to widen the list."
                                }
                            />
                        ) : (
                            <>
                                <PublicCardsView cards={cards} />
                                <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => listHref(base, query, { page: n })} />
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
