import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CollectionDetailActions } from "@/components/app/collection-detail-actions";
import { FolderPage } from "@/components/app/folder-page";
import { Badge } from "@/components/base/badges/badges";
import { getMyCards } from "@/lib/cards";
import { getCollection } from "@/lib/collections";
import { ruleChips } from "@/lib/folder-rule";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

// A folder of your own: filed by hand, or filled by its rule.
export default async function CollectionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    const { id } = await params;
    const collection = await getCollection(id);
    if (!collection) notFound();

    const query = readListQuery(await searchParams);
    const { page, q, sort, order, set, rarity } = query;
    const { cards, total, facets } = await getMyCards({ collectionId: id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q, sort, order, set, rarity });

    return (
        <FolderPage
            title={collection.name}
            back={{ href: "/dashboard/collections", label: "Folders" }}
            datapoints={{ total, narrowed: isNarrowed(query) }}
            actions={<CollectionDetailActions folder={collection} facets={facets} />}
            query={query}
            basePath={`/dashboard/collections/${id}`}
            facets={facets}
            cards={cards}
            total={total}
            pageSize={PAGE_SIZE}
            empty={
                collection.rule ? (
                    <AppEmptyState icon="folder" title="Nothing matches yet" description="Cards you own that fit the rule show up here" />
                ) : (
                    <AppEmptyState icon="folder" title="No cards in this folder" description="Use “Add cards” to fill it" />
                )
            }
        >
            {collection.rule ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Rule">
                    {ruleChips(collection.rule, facets).map((chip) => (
                        <li key={chip}>
                            <Badge size="sm" color="gray" type="pill-color">
                                {chip}
                            </Badge>
                        </li>
                    ))}
                </ul>
            ) : null}
        </FolderPage>
    );
}
