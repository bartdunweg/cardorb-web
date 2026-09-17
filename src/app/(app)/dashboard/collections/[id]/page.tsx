import { type ComponentProps, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BinderAddButton } from "@/components/app/binder-add-button";
import { BinderMenu } from "@/components/app/binder-menu";
import { FolderPage } from "@/components/app/folder-page";
import { PokedexRarityNote } from "@/components/app/pokedex-rarity-note";
import { ListSkeleton } from "@/components/app/skeletons";
import { Badge } from "@/components/base/badges/badges";
import { type CardFilter, type Facets, getDexCards, getMyCards } from "@/lib/cards";
import { getCollection } from "@/lib/collections";
import { type DexList, groupByDex } from "@/lib/dex-groups";
import { type FolderRule, ruleChips } from "@/lib/folder-rule";
import { openAsLeft } from "@/lib/list-memory-server";
import { type ListSearchParams, changeWindow, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";

// The binder's own name in the tab. `getCollection` reads the folder list, which is cached five
// minutes per person, so this is the same read the page makes and costs nothing extra.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const collection = await getCollection(id);
    return { title: collection?.name ?? "Binder" };
}

// A folder of your own: filed by hand, or filled by its rule; as a list, or as a Pokédex. The
// folder itself is a cached read; the cards are not awaited, and the facets come with them (see cards/page.tsx).
export default function CollectionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    // The binder's name comes with the folder list, so the title waits on that read; Back does not.
    return (
        <Suspense fallback={<ListSkeleton back={{ href: "/dashboard/collections", label: "Binders" }} />}>
            <Binder params={params} searchParams={searchParams} />
        </Suspense>
    );
}

async function Binder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    const { id } = await params;
    const collection = await getCollection(id);
    if (!collection) notFound();

    const asked = await searchParams;
    // A bare address opens the binder as it was left (list-memory-server.ts).
    await openAsLeft(`/dashboard/collections/${id}`, asked);
    const query = readListQuery(asked);
    const { q, sort, order, set, rarity, fullArt, gen, type, condition, finish, language, duplicates } = query;
    const filter: CardFilter = {
        collectionId: id,
        q,
        sort,
        order,
        // A change sort reads over its period's days (list-query.ts changeWindow).
        ...(sort === "change" ? changeWindow(query) : {}),
        set,
        rarity,
        fullArt,
        gen,
        type,
        condition,
        finish,
        language,
        duplicates,
    };
    const narrowed = isNarrowed(query);
    // The cards are read before anything is drawn and not awaited: the facets ride with their first
    // answer, as on the Collection page, rather than costing a read of their own before the first byte.
    const setting = collection.pokedex;
    const dexCards = setting ? getDexCards(filter) : null;
    const list = dexCards ? null : getMyCards(filter);
    const facets: Promise<Facets> = dexCards ? dexCards.then((r) => r.facets) : list!.then((r) => r.facets);
    // A rule names a set by its code; the facets carry the title a chip should read. Until they are in,
    // the chips read as they would without them.
    const rule = collection.rule;
    const chips = rule ? (
        <Suspense fallback={<RuleChips rule={rule} />}>
            <RuleChipsWithTitles rule={rule} facets={facets} />
        </Suspense>
    ) : null;
    // The same plus the header has, in the middle of the room: on a phone the header's plus is
    // in the bar at the bottom, and "press the plus" pointed at nothing in view.
    const empty = collection.rule ? (
        <AppEmptyState icon="folder" title="Nothing matches yet" description="Cards you own that fit the rule show up here">
            <AddCardButton />
        </AppEmptyState>
    ) : (
        <AppEmptyState icon="folder" title="No cards in this binder" description="Add a card you own, or a new one">
            <BinderAddButton folder={{ id: collection.id, name: collection.name }} compact={false} />
        </AppEmptyState>
    );
    const common = {
        title: collection.name,
        back: { href: "/dashboard/collections", label: "Binders" },
        // The dots and the plus, the pair every list has. A binder filled by hand takes a card from
        // its own page, new or already yours, so its plus asks which; a rule binder fills itself, and
        // its plus is the plain Add card.
        // The menu is there at once; its edit form is handed the facets when they are in, and asks for
        // them itself when opened before that (folder-dialog.tsx).
        settings: (compact: boolean) => (
            <Suspense fallback={<BinderMenu folder={collection} compact={compact} />}>
                <BinderMenuWithFacets folder={collection} facets={facets} compact={compact} />
            </Suspense>
        ),
        add: collection.rule
            ? (compact: boolean) => <AddCardButton compact={compact} />
            : (compact: boolean) => <BinderAddButton folder={collection} compact={compact} />,
        query,
        basePath: `/dashboard/collections/${id}`,
        facets,
        filter,
        empty,
    };

    if (setting && dexCards) {
        // The slots need every card, not a batch (getDexCards, kept per person); the names fill the
        // slots the folder has none of. The count and the value are the slots' own, as on the built-in
        // Pokédex: a rarity the setting leaves out is not in the binder, whatever the read returned.
        const dex: Promise<DexList> = Promise.all([dexCards, getDexNames()]).then(([r, names]) => {
            const grouped = groupByDex(r.cards, names, setting);
            return { ...grouped, total: grouped.cards, held: r.cards.length };
        });
        const datapoints = dex.then((d) => ({
            total: d.total,
            copies: d.copies,
            narrowed,
            value: d.value,
            unpriced: d.unpriced,
            caught: { of: d.caught, total: d.range.to - d.range.from + 1 },
        }));
        return (
            <FolderPage {...common} datapoints={datapoints} pokedex={{ dex }}>
                {chips}
                {/* Why a slot can be grey for a card you own: the rarities this binder counts. */}
                <PokedexRarityNote folderId={collection.id} setting={setting} />
            </FolderPage>
        );
    }

    const cards = list!;
    const datapoints = cards.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced }));
    return (
        <FolderPage {...common} datapoints={datapoints} list={cards}>
            {chips}
        </FolderPage>
    );
}

function RuleChips({ rule, facets }: { rule: FolderRule; facets?: Facets }) {
    return (
        <ul className="flex flex-wrap gap-1.5" aria-label="Rule">
            {ruleChips(rule, facets).map((chip) => (
                <li key={chip}>
                    <Badge size="sm" color="gray" type="pill-color">
                        {chip}
                    </Badge>
                </li>
            ))}
        </ul>
    );
}

// A list that cannot be read shows its own error below; the chips keep the codes rather than join it.
async function RuleChipsWithTitles({ rule, facets }: { rule: FolderRule; facets: Promise<Facets> }) {
    return <RuleChips rule={rule} facets={await facets.catch(() => undefined)} />;
}

async function BinderMenuWithFacets({ facets, ...menu }: Omit<ComponentProps<typeof BinderMenu>, "facets"> & { facets: Promise<Facets> }) {
    return <BinderMenu {...menu} facets={await facets.catch(() => undefined)} />;
}
