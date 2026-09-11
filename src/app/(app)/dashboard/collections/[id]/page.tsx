import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CollectionDetailActions } from "@/components/app/collection-detail-actions";
import { FolderPage } from "@/components/app/folder-page";
import { Badge } from "@/components/base/badges/badges";
import { type CardFilter, getAllMyCards, getFacets, getMyCards } from "@/lib/cards";
import { getCollection } from "@/lib/collections";
import { type DexList, groupByDex } from "@/lib/dex-groups";
import { ruleChips } from "@/lib/folder-rule";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";

// The binder's own name in the tab. `getCollection` reads the folder list, which is cached five
// minutes per person, so this is the same read the page makes and costs nothing extra.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const collection = await getCollection(id);
    return { title: collection?.name ?? "Binder" };
}

// A folder of your own: filed by hand, or filled by its rule; as a list, or as a Pokédex. The
// folder itself and the facets are cached reads; the cards are not awaited (see cards/page.tsx).
export default async function CollectionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    const { id } = await params;
    const [collection, facets] = await Promise.all([getCollection(id), getFacets()]);
    if (!collection) notFound();

    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, gen, type, unpriced } = query;
    const filter: CardFilter = { collectionId: id, q, sort, order, set, rarity, gen, type, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    // A rule names a set by its code; the facets carry the title a chip should read.
    const chips = collection.rule ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Rule">
            {ruleChips(collection.rule, facets).map((chip) => (
                <li key={chip}>
                    <Badge size="sm" color="gray" type="pill-color">
                        {chip}
                    </Badge>
                </li>
            ))}
        </ul>
    ) : null;
    const empty = collection.rule ? (
        <AppEmptyState icon="folder" title="Nothing matches yet" description="Cards you own that fit the rule show up here" />
    ) : (
        <AppEmptyState icon="folder" title="No cards in this binder" description="Use “Add cards” to fill it" />
    );
    const common = {
        title: collection.name,
        back: { href: "/dashboard/collections", label: "Collection" },
        actions: <CollectionDetailActions folder={collection} facets={facets} />,
        // A folder filled by hand takes a card straight from its own page; a rule folder fills itself.
        add: collection.rule
            ? undefined
            : (compact: boolean) => <AddCardButton compact={compact} collectionId={collection.id} collectionName={collection.name} />,
        query,
        basePath: `/dashboard/collections/${id}`,
        facets,
        filter,
        empty,
    };

    if (collection.pokedex) {
        // The slots need every card, not a batch; the names fill the slots the folder has none of.
        const setting = collection.pokedex;
        const dex: Promise<DexList> = Promise.all([getAllMyCards(filter), getDexNames()]).then(([r, names]) => ({
            ...groupByDex(r.cards, names, setting),
            total: r.total,
            copies: r.copies ?? undefined,
            value: r.value,
            unpriced: r.unpriced,
        }));
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
            </FolderPage>
        );
    }

    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced }));
    return (
        <FolderPage {...common} datapoints={datapoints} list={list}>
            {chips}
        </FolderPage>
    );
}
