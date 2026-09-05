import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CollectionDetailActions } from "@/components/app/collection-detail-actions";
import { FolderPage } from "@/components/app/folder-page";
import { Badge } from "@/components/base/badges/badges";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { type Facets, getAllMyCards, getMyCards } from "@/lib/cards";
import { getCollection } from "@/lib/collections";
import { groupByDex } from "@/lib/dex-groups";
import { ruleChips } from "@/lib/folder-rule";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";

const PAGE_SIZE = 100;

// A folder of your own: filed by hand, or filled by its rule; as a list, or as a Pokédex.
export default async function CollectionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    const { id } = await params;
    const collection = await getCollection(id);
    if (!collection) notFound();

    const query = readListQuery(await searchParams);
    const { page, q, sort, order, set, rarity } = query;
    const filter = { collectionId: id, q, sort, order, set, rarity };
    // A rule names a set by its code; the facets carry the title a chip should read.
    const chipsFor = (facets: Facets) =>
        collection.rule ? (
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
        <AppEmptyState icon="folder" title="No cards in this folder" description="Use “Add cards” to fill it" />
    );

    if (collection.pokedex) {
        // The slots need every card, not a page; the names fill the slots the folder has none of.
        const [{ cards, total, facets, value, unpriced }, names] = await Promise.all([getAllMyCards(filter), getDexNames()]);
        const dex = groupByDex(cards, names, collection.pokedex);
        const span = dex.range.to - dex.range.from + 1;
        return (
            <FolderPage
                title={collection.name}
                back={{ href: "/dashboard/collections", label: "Folders" }}
                datapoints={{ total, narrowed: isNarrowed(query), value, unpriced, caught: { of: dex.caught, total: span } }}
                actions={<CollectionDetailActions folder={collection} facets={facets} />}
                query={query}
                basePath={`/dashboard/collections/${id}`}
                facets={facets}
                cards={cards}
                total={total}
                empty={empty}
                pokedex={{ slots: dex.slots }}
            >
                {chipsFor(facets)}
                <ProgressBarBase value={dex.caught} max={span} className="mt-2 max-w-md" aria-label="Pokédex completion" />
            </FolderPage>
        );
    }

    const { cards, total, facets, value, unpriced } = await getMyCards({ ...filter, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    return (
        <FolderPage
            title={collection.name}
            back={{ href: "/dashboard/collections", label: "Folders" }}
            datapoints={{ total, narrowed: isNarrowed(query), value, unpriced }}
            actions={<CollectionDetailActions folder={collection} facets={facets} />}
            query={query}
            basePath={`/dashboard/collections/${id}`}
            facets={facets}
            cards={cards}
            total={total}
            pageSize={PAGE_SIZE}
            empty={empty}
        >
            {chipsFor(facets)}
        </FolderPage>
    );
}
