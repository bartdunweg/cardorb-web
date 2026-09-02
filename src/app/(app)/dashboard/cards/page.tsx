import { Plus } from "@untitledui/icons";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsSearch } from "@/components/app/cards-search";
import { CardsView } from "@/components/app/cards-view";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";

const PAGE_SIZE = 100;

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
    const { q, page: pageParam } = await searchParams;
    const page = Math.max(1, Number(pageParam) || 1);
    const { cards, total } = await getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // No cards at all (and no active search) → empty state with the one action that gets you out of it.
    if (!q && total === 0) {
        return (
            <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                <AddCardModal trigger={<Button iconLeading={Plus}>Add card</Button>} />
            </AppEmptyState>
        );
    }

    const pageHref = (n: number) => {
        const p = new URLSearchParams();
        if (q) p.set("q", q);
        if (n > 1) p.set("page", String(n));
        const s = p.toString();
        return s ? `/dashboard/cards?${s}` : "/dashboard/cards";
    };

    return (
        <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">All cards</h1>
                <p className="text-md text-tertiary">Browse and filter your whole collection.</p>
            </div>

            <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <CardsSearch initialValue={q ?? ""} />
                    <AddCardModal />
                </div>

                {total === 0 ? (
                    <AppEmptyState icon="search" title="No cards found" description={`No cards match “${q}”. Try a different name or set.`} />
                ) : (
                    <>
                        <CardsView cards={cards} />

                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-tertiary">
                                {q ? `${total.toLocaleString("en-US")} match${total === 1 ? "" : "es"}` : `${total.toLocaleString("en-US")} cards`}
                                {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
                            </p>

                            {totalPages > 1 ? (
                                <div className="flex gap-2">
                                    <Button color="secondary" size="sm" {...(page > 1 ? { href: pageHref(page - 1) } : { isDisabled: true })}>
                                        Previous
                                    </Button>
                                    <Button color="secondary" size="sm" {...(page < totalPages ? { href: pageHref(page + 1) } : { isDisabled: true })}>
                                        Next
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
