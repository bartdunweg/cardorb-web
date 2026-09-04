import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination, pageFromParam } from "@/components/app/cards-pagination";
import { PublicCardsView } from "@/components/app/public-cards-view";
import { PublicTopBar } from "@/components/app/public-top-bar";
import { Avatar } from "@/components/base/avatar/avatar";
import { getViewer } from "@/lib/profile";
import { PUBLIC_PAGE_SIZE, getPublicCards, getPublicProfile } from "@/lib/public-profile";

type Params = { params: Promise<{ username: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
    const { username } = await params;
    const page = pageFromParam((await searchParams).page);
    const base = `/user/${encodeURIComponent(username)}`;
    // Each page names itself: a shared or indexed second page must not collapse onto the first.
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

    const page = pageFromParam((await searchParams).page);
    const [{ cards, total, sets }, viewer] = await Promise.all([getPublicCards(decodeURIComponent(username), page), getViewer()]);
    const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
    const base = `/user/${encodeURIComponent(username)}`;
    const name = profile.display_name || profile.username || "Collection";
    // The handle sits under a display name, as a profile page does; with no display name it is the name.
    const handle = profile.display_name && profile.username ? `@${profile.username}` : null;
    const counts = [`${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"}`, `${sets.toLocaleString("en-US")} set${sets === 1 ? "" : "s"}`].join(
        " · ",
    );

    return (
        <div className="flex min-h-dvh flex-col bg-primary">
            <PublicTopBar account={viewer} />

            <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex items-center gap-4">
                    <Avatar size="xl" src={profile.avatar_url ?? undefined} alt={name} />
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-xs font-semibold text-primary">{name}</h1>
                        {handle ? <p className="text-md text-tertiary">{handle}</p> : null}
                        <p className="text-sm font-medium text-secondary tabular-nums">{counts}</p>
                    </div>
                </div>

                {cards.length === 0 ? (
                    <AppEmptyState icon="folder" title="This collection is empty" description="Nothing has been added to it yet" />
                ) : (
                    <>
                        <PublicCardsView cards={cards} />
                        <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => (n > 1 ? `${base}?page=${n}` : base)} />
                    </>
                )}
            </main>
        </div>
    );
}
