import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { CollectionDetailActions } from "@/components/app/collection-detail-actions";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/base/badges/badges";
import { getMyCards } from "@/lib/cards";
import { CARDS_VIEW_COOKIE, parseCardsView } from "@/lib/cards-view";
import { getCollection } from "@/lib/collections";
import { ruleChips, ruleSummary } from "@/lib/folder-rule";
import { listHref, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

export default async function CollectionDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ page?: string; sort?: string }>;
}) {
    const { id } = await params;
    const collection = await getCollection(id);
    if (!collection) notFound();

    const query = readListQuery(await searchParams);
    const { page, sort, order } = query;
    const { cards, total, facets } = await getMyCards({ collectionId: id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort, order });
    const count = `${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"}`;
    const view = parseCardsView((await cookies()).get(CARDS_VIEW_COOKIE)?.value);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title={collection.name}
                subtitle={collection.rule ? `${count} · ${ruleSummary(collection.rule, facets)}` : count}
                back={{ href: "/dashboard/collections", label: "Folders" }}
                actions={
                    <>
                        <CardsSort query={query} />
                        <CollectionDetailActions folder={collection} facets={facets} />
                    </>
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
            </PageHeader>

            {total === 0 ? (
                collection.rule ? (
                    <AppEmptyState icon="folder" title="Nothing matches yet" description="Cards you own that fit the rule show up here" />
                ) : (
                    <AppEmptyState icon="folder" title="No cards in this folder" description="Use “Add cards” to fill it" />
                )
            ) : (
                <>
                    <CardsView cards={cards} initialView={view} />
                    <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => listHref(`/dashboard/collections/${id}`, query, { page: n })} />
                </>
            )}
        </div>
    );
}
