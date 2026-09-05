import { cookies } from "next/headers";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";
import { CARDS_VIEW_COOKIE, parseCardsView } from "@/lib/cards-view";
import { listHref, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string }> }) {
    const query = readListQuery(await searchParams);
    const { page, sort, order } = query;
    const { cards, total } = await getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort, order, wishlist: true });
    const view = parseCardsView((await cookies()).get(CARDS_VIEW_COOKIE)?.value);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // The header stays on an empty page: it is the page's title, and on a phone it carries Back.
    // The empty state has the one action, so the header carries none then.
    const header = (
        <PageHeader
            title="Wishlist"
            subtitle={`${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"} you want but don’t own yet`}
            actions={
                total > 0 ? (
                    <>
                        <CardsSort query={query} />
                        <AddCardModal defaultTarget="wishlist" />
                    </>
                ) : undefined
            }
        />
    );

    if (total === 0) {
        return (
            <div className="flex flex-1 flex-col gap-6">
                {header}
                <AppEmptyState icon="heart" title="Your wishlist is empty" description="Add cards you’re looking for but don’t own yet">
                    <AddCardModal defaultTarget="wishlist" trigger={<Button>Add to wishlist</Button>} />
                </AppEmptyState>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {header}

            <CardsView cards={cards} initialView={view} />
            <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => listHref("/dashboard/wishlist", query, { page: n })} />
        </div>
    );
}
