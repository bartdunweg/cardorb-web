import type { Metadata } from "next";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BinderPage } from "@/components/app/binder-page";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { openAsLeft } from "@/lib/list-memory-server";
import { type ListSearchParams, changeWindow, isNarrowed, readListQuery } from "@/lib/list-query";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Collection" };

// Every card you own: the whole collection as one list, a tab of its own beside Home.
//
// The list is not awaited: the title, the actions and the row go to the browser at once, and
// the first batch of cards, with the count and value under the title, follows when the API
// answers. The facets for the Filters menu are a cached read, five minutes per person.
export default async function CardsPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const params = await searchParams;
    // A bare address opens the list as it was left (list-memory-server.ts).
    await openAsLeft("/dashboard/cards", params);
    const query = readListQuery(params);
    const { q, sort, order, set, rarity, fullArt, gen, type, condition, finish, language, duplicates } = query;
    const filter: CardFilter = {
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
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced, listed: r.listed }));
    // The facets ride with the list's first page: nothing else is read before the first byte.
    const facets = list.then((r) => r.facets);

    return (
        <BinderPage
            title="Collection"
            datapoints={datapoints}
            add={(compact) => <AddCardButton compact={compact} />}
            query={query}
            basePath="/dashboard/cards"
            facets={facets}
            list={list}
            filter={filter}
            empty={
                <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                    <AddCardButton />
                </AppEmptyState>
            }
        />
    );
}
