import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { DashboardLink } from "@/components/app/dashboard-link";
import { FolderBody } from "@/components/app/folder-body";
import { LinkButton } from "@/components/app/link-button";
import { PublicTopBar } from "@/components/app/public-top-bar";
import { Avatar } from "@/components/base/avatar/avatar";
import { type DexList, groupByDex } from "@/lib/dex-groups";
import { datapointsLine } from "@/lib/folder-datapoints";
import { DEFAULT_POKEDEX } from "@/lib/folder-rule";
import { type ListSearchParams, PUBLIC_DEFAULT_SORT, PUBLIC_SORT_OPTIONS, isNarrowed, listHref, readPublicListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";
import { getViewer } from "@/lib/profile";
import { PUBLIC_PAGE_SIZE, countPublicCards, getAllPublicCards, getPublicCards, getPublicFolders, getPublicProfile } from "@/lib/public-profile";

type Params = { params: Promise<{ username: string }>; searchParams: Promise<ListSearchParams> };

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
        // `type` and `siteName` are repeated here rather than inherited: a page-level `openGraph`
        // replaces the root's wholesale, so without these two the one page people actually
        // paste into a chat was the only one shipping neither.
        openGraph: { type: "profile", siteName: "Cardorb", title: `${name}'s collection`, description, url: canonical, images: ["/opengraph-image"] },
    };
}

export default async function PublicProfilePage({ params, searchParams }: Params) {
    const { username } = await params;
    const profile = await getPublicProfile(decodeURIComponent(username));
    if (!profile) notFound();

    const query = readPublicListQuery(await searchParams);
    const narrowed = isNarrowed(query);
    // A list the owner does not show is the collection: the chips say so, and the route would 404.
    const list =
        query.list === "wishlist" && profile.wishlist_public
            ? "wishlist"
            : query.list === "favorites" && profile.favorites_public
              ? "favorites"
              : query.list === "pokedex" && profile.pokedex_public
                ? "pokedex"
                : undefined;
    if (list !== query.list) query.list = list;
    // The Pokédex needs every card, and takes longest to read: it is not awaited, and the slots
    // take their place under the row when the last page is in, as on the owner's own page.
    const dex: Promise<DexList> | null =
        list === "pokedex"
            ? Promise.all([getAllPublicCards(decodeURIComponent(username), query), getDexNames()]).then(([r, names]) => ({
                  ...groupByDex(r.cards, names, profile.pokedex ?? DEFAULT_POKEDEX),
                  total: r.total,
                  value: null,
                  unpriced: 0,
              }))
            : null;
    // The paged read for every list, the Pokédex too: its first page carries the count and the facets
    // at once, while the slots' own read of every card streams in behind the row.
    const [{ cards, total, facets }, folders, viewer, owned, wishes] = await Promise.all([
        getPublicCards(decodeURIComponent(username), query),
        getPublicFolders(decodeURIComponent(username)),
        getViewer(),
        // The line under the name counts the whole collection and the wishlist, whatever list is open.
        countPublicCards(decodeURIComponent(username)),
        profile.wishlist_public ? countPublicCards(decodeURIComponent(username), "wishlist") : Promise.resolve(null),
    ]);
    // A folder in the URL that the owner does not show: the API answered the whole list; the chips say so too.
    const folder = folders.find((f) => f.id === query.folder) ?? null;
    const base = `/user/${encodeURIComponent(username)}`;
    const name = profile.display_name || profile.username || "Collection";
    // What an empty list says, by which list it is: the words are the visitor's, not the owner's.
    const emptyState =
        list === "wishlist" ? (
            <AppEmptyState icon="heart" title="Nothing on the wishlist" description="No cards are being looked for right now" />
        ) : list === "favorites" ? (
            <AppEmptyState icon="star" title="No favorites yet" description="No card has been starred" />
        ) : (
            <AppEmptyState icon="folder" title="This collection is empty" description="Nothing has been added to it yet" />
        );
    // The handle sits under a display name, as a profile page does; with no display name it is the name.
    const handle = profile.display_name && profile.username ? `@${profile.username}` : null;
    // With a search or a filter on, the count is what matched; otherwise the collection and the wishlist.
    const counts = narrowed
        ? datapointsLine({ total, narrowed })
        : [datapointsLine({ total: owned, narrowed: false }), wishes != null ? `${wishes.toLocaleString("en-US")} on the wishlist` : null]
              .filter(Boolean)
              .join(" · ");

    return (
        <div className="flex min-h-dvh flex-col bg-page">
            {/* Signed in: the way back to the dashboard, top right. A visitor gets the bar alone. */}
            <PublicTopBar menu={viewer ? <DashboardLink account={viewer} /> : undefined} />

            <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
                {/* Centred, as a profile page is read: the person first, then what they hold, then the ways to act on it. */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar size="2xl" src={profile.avatar_url ?? undefined} alt="" className="size-24" />
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="text-display-sm font-semibold text-primary">{name}</h1>
                        {handle ? <p className="text-md text-tertiary">{handle}</p> : null}
                        <p className="text-md font-medium text-secondary tabular-nums">{counts}</p>
                    </div>
                </div>

                {folders.length > 0 || profile.wishlist_public || profile.favorites_public || profile.pokedex_public ? (
                    // The folders the owner shows, as chips that narrow the list; All cards first. A chip is a link,
                    // so a folder is a URL that can be shared, and the row keeps its place through a search.
                    <nav aria-label="Folders" className="flex flex-wrap gap-2">
                        {[{ id: null as string | null, name: "All cards", count: null as number | null }, ...folders].map((f) => {
                            const current = query.list === undefined && (folder?.id ?? null) === f.id;
                            return (
                                // The kit's button as a link, primary for the one in view: the same pill and colours as
                                // every other control, in both themes.
                                <LinkButton
                                    key={f.id ?? "all"}
                                    href={listHref(base, query, { folder: f.id ?? undefined, list: undefined, page: 1 }, PUBLIC_DEFAULT_SORT)}
                                    size="sm"
                                    color={current ? "primary" : "secondary"}
                                    aria-current={current ? "page" : undefined}
                                >
                                    {f.name}
                                    {f.count != null ? <span className="ml-1.5 tabular-nums opacity-70">{f.count.toLocaleString("en-US")}</span> : null}
                                </LinkButton>
                            );
                        })}
                        {/* The three lists beside the folders, each behind the owner's own setting. The favorites and
                            the Pokédex are the collection seen another way; the wishlist is what they are looking for. */}
                        {(
                            [
                                ["favorites", "Favorites", profile.favorites_public],
                                ["pokedex", "Pokédex", profile.pokedex_public],
                                ["wishlist", "Wishlist", profile.wishlist_public],
                            ] as const
                        )
                            .filter(([, , shown]) => shown)
                            .map(([id, label]) => (
                                <LinkButton
                                    key={id}
                                    href={listHref(base, query, { folder: undefined, list: id, page: 1 }, PUBLIC_DEFAULT_SORT)}
                                    size="sm"
                                    color={query.list === id ? "primary" : "secondary"}
                                    aria-current={query.list === id ? "page" : undefined}
                                >
                                    {label}
                                </LinkButton>
                            ))}
                    </nav>
                ) : null}

                {dex ? (
                    <FolderBody
                        readOnly
                        query={query}
                        basePath={base}
                        facets={facets}
                        sortOptions={PUBLIC_SORT_OPTIONS}
                        defaultSortKey={PUBLIC_DEFAULT_SORT}
                        searchLabel="Search this collection"
                        searchPlaceholder="Search this collection"
                        pokedex={{ dex }}
                        empty={emptyState}
                    />
                ) : (
                    <FolderBody
                        readOnly
                        query={query}
                        basePath={base}
                        facets={facets}
                        sortOptions={PUBLIC_SORT_OPTIONS}
                        defaultSortKey={PUBLIC_DEFAULT_SORT}
                        searchLabel="Search this collection"
                        searchPlaceholder="Search this collection"
                        cards={cards}
                        total={total}
                        pageSize={PUBLIC_PAGE_SIZE}
                        empty={emptyState}
                    />
                )}
            </main>
        </div>
    );
}
