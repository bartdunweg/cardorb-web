import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardsPagination, pageFromParam } from "@/components/app/cards-pagination";
import { PublicCardsView } from "@/components/app/public-cards-view";
import { Avatar } from "@/components/base/avatar/avatar";
import { getPublicCards, getPublicProfile } from "@/lib/public-profile";

type Params = { params: Promise<{ username: string }>; searchParams: Promise<{ page?: string }> };

const PAGE_SIZE = 100;

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

    const { cards: all, sets } = await getPublicCards(decodeURIComponent(username));
    const total = all.length;
    const page = pageFromParam((await searchParams).page);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const cards = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const base = `/user/${encodeURIComponent(username)}`;
    const name = profile.display_name || profile.username || "Collection";
    // The handle sits under a display name, as a profile page does; with no display name it is the name.
    const handle = profile.display_name && profile.username ? `@${profile.username}` : null;
    const counts = [`${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"}`, `${sets.toLocaleString("en-US")} set${sets === 1 ? "" : "s"}`].join(
        " · ",
    );

    return (
        <div className="flex min-h-dvh flex-col bg-primary">
            <header className="mx-auto flex w-full max-w-container items-center justify-between px-4 py-5 sm:px-6 md:px-8">
                <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                    Cardorb
                </Link>
            </header>

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
                    <p className="flex flex-1 items-center justify-center py-16 text-center text-sm text-tertiary">This collection is empty.</p>
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
