import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderBody } from "@/components/app/folder-body";
import { LinkButton } from "@/components/app/link-button";
import { PublicTopBar } from "@/components/app/public-top-bar";
import { ShareButton } from "@/components/app/share-button";
import { Avatar } from "@/components/base/avatar/avatar";
import { datapointsLine } from "@/lib/folder-datapoints";
import { type ListSearchParams, PUBLIC_SORT_OPTIONS, isNarrowed, listHref, readPublicListQuery } from "@/lib/list-query";
import { getMyProfile, getViewer } from "@/lib/profile";
import { PUBLIC_PAGE_SIZE, getPublicCards, getPublicFolders, getPublicProfile } from "@/lib/public-profile";
import { RouteProvider } from "@/providers/router-provider";

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
        openGraph: { title: `${name}'s collection`, description, url: canonical, images: ["/opengraph-image"] },
    };
}

export default async function PublicProfilePage({ params, searchParams }: Params) {
    const { username } = await params;
    const profile = await getPublicProfile(decodeURIComponent(username));
    if (!profile) notFound();

    const query = readPublicListQuery(await searchParams);
    const narrowed = isNarrowed(query);
    const [{ cards, total, facets }, folders, viewer] = await Promise.all([
        getPublicCards(decodeURIComponent(username), query),
        getPublicFolders(decodeURIComponent(username)),
        getViewer(),
    ]);
    // A folder in the URL that the owner does not show: the API answered the whole list; the chips say so too.
    const folder = folders.find((f) => f.id === query.folder) ?? null;
    // Whose page this is: the owner looking at their own gets Edit profile beside Share. The
    // profile read is the layout's cached one; a session the API refuses counts as a visitor.
    const mine = viewer
        ? await getMyProfile().then(
              (me) => me.profile?.username === profile.username,
              () => false,
          )
        : false;
    const base = `/user/${encodeURIComponent(username)}`;
    const name = profile.display_name || profile.username || "Collection";
    // The handle sits under a display name, as a profile page does; with no display name it is the name.
    const handle = profile.display_name && profile.username ? `@${profile.username}` : null;
    // With a search or a filter on, the count is what matched.
    const counts = datapointsLine({ total, narrowed });

    return (
        <div className="bg-page flex min-h-dvh flex-col">
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

            <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
                {/* Centred, as a profile page is read: the person first, then what they hold, then the ways to act on it. */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar size="2xl" src={profile.avatar_url ?? undefined} alt={name} className="size-24" />
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="text-display-sm font-semibold text-primary">{name}</h1>
                        {handle ? <p className="text-md text-tertiary">{handle}</p> : null}
                        <p className="text-md font-medium text-secondary tabular-nums">{counts}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <ShareButton title={`${name}'s collection on Cardorb`} />
                        {mine ? (
                            <LinkButton href="/dashboard/settings" color="secondary" size="md">
                                Edit profile
                            </LinkButton>
                        ) : null}
                    </div>
                </div>

                {folders.length > 0 ? (
                    // The folders the owner shows, as chips that narrow the list; All cards first. A chip is a link,
                    // so a folder is a URL that can be shared, and the row keeps its place through a search.
                    <nav aria-label="Folders" className="flex flex-wrap gap-2">
                        {[{ id: null as string | null, name: "All cards", count: null as number | null }, ...folders].map((f) => {
                            const current = (folder?.id ?? null) === f.id;
                            return (
                                // The kit's button as a link, primary for the one in view: the same pill and colours as
                                // every other control, in both themes.
                                <LinkButton
                                    key={f.id ?? "all"}
                                    href={listHref(base, query, { folder: f.id ?? undefined, page: 1 })}
                                    size="sm"
                                    color={current ? "primary" : "secondary"}
                                    aria-current={current ? "page" : undefined}
                                >
                                    {f.name}
                                    {f.count != null ? <span className="ml-1.5 tabular-nums opacity-70">{f.count.toLocaleString("en-US")}</span> : null}
                                </LinkButton>
                            );
                        })}
                    </nav>
                ) : null}

                <FolderBody
                    readOnly
                    query={query}
                    basePath={base}
                    facets={facets}
                    sortOptions={PUBLIC_SORT_OPTIONS}
                    searchLabel="Search this collection"
                    searchPlaceholder="Search this collection"
                    cards={cards}
                    total={total}
                    pageSize={PUBLIC_PAGE_SIZE}
                    empty={<AppEmptyState icon="folder" title="This collection is empty" description="Nothing has been added to it yet" />}
                />
            </main>
        </div>
    );
}
