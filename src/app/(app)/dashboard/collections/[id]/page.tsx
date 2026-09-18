import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BinderAddButton } from "@/components/app/binder-add-button";
import { BinderMenu } from "@/components/app/binder-menu";
import { BinderPage } from "@/components/app/binder-page";
import { PokedexRarityNote } from "@/components/app/pokedex-rarity-note";
import { ListSkeleton } from "@/components/app/skeletons";
import { Badge } from "@/components/base/badges/badges";
import { type BinderRule, ruleChips } from "@/lib/binder-rule";
import { getBinder } from "@/lib/binders";
import { type CardFilter, type Facets, getDexCards, getMyCards } from "@/lib/cards";
import { type DexList, groupByDex } from "@/lib/dex-groups";
import { openAsLeft } from "@/lib/list-memory-server";
import { type ListSearchParams, changeWindow, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";

// The binder's own name in the tab. `getBinder` reads the binder list, which is cached five
// minutes per person, so this is the same read the page makes and costs nothing extra.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const binder = await getBinder(id);
    return { title: binder?.name ?? "Binder" };
}

// A binder of your own: filed by hand, or filled by its rule; as a list, or as a Pokédex. The
// binder itself is a cached read; the cards are not awaited, and the facets come with them (see cards/page.tsx).
export default function BinderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    // The binder's name comes with the binder list, so the title waits on that read; Back does not.
    return (
        <Suspense fallback={<ListSkeleton back={{ href: "/dashboard/collections", label: "Binders" }} />}>
            <Binder params={params} searchParams={searchParams} />
        </Suspense>
    );
}

async function Binder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListSearchParams> }) {
    const { id } = await params;
    const binder = await getBinder(id);
    if (!binder) notFound();

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
    const setting = binder.pokedex;
    const dexCards = setting ? getDexCards(filter) : null;
    const list = dexCards ? null : getMyCards(filter);
    const facets: Promise<Facets> = dexCards ? dexCards.then((r) => r.facets) : list!.then((r) => r.facets);
    // A rule names a set by its code; the facets carry the title a chip should read. Until they are in,
    // the chips read as they would without them.
    const rule = binder.rule;
    const chips = rule ? (
        <Suspense fallback={<RuleChips rule={rule} />}>
            <RuleChipsWithTitles rule={rule} facets={facets} />
        </Suspense>
    ) : null;
    // The same plus the header has, in the middle of the room: on a phone the header's plus is
    // in the bar at the bottom, and "press the plus" pointed at nothing in view.
    const empty = binder.rule ? (
        <AppEmptyState icon="folder" title="Nothing matches yet" description="Cards you own that fit the rule show up here">
            <AddCardButton />
        </AppEmptyState>
    ) : (
        <AppEmptyState icon="folder" title="No cards in this binder" description="Add a card you own, or a new one">
            <BinderAddButton binder={{ id: binder.id, name: binder.name }} compact={false} />
        </AppEmptyState>
    );
    const common = {
        title: binder.name,
        back: { href: "/dashboard/collections", label: "Binders" },
        // The dots and the plus, the pair every list has. A binder filled by hand takes a card from
        // its own page, new or already yours, so its plus asks which; a rule binder fills itself, and
        // its plus is the plain Add card.
        // The menu is there at once; its edit form is handed the facets when they are in, and asks for
        // them itself when opened before that (binder-dialog.tsx). Handed over as the promise, not
        // behind a Suspense boundary with the menu as its fallback: the fallback menu was swapped
        // for a new one when the facets came in, and one opened in between closed under the finger.
        settings: (compact: boolean) => <BinderMenu binder={binder} facets={facets.catch(() => undefined)} compact={compact} />,
        add: binder.rule
            ? (compact: boolean) => <AddCardButton compact={compact} />
            : (compact: boolean) => <BinderAddButton binder={binder} compact={compact} />,
        query,
        basePath: `/dashboard/collections/${id}`,
        facets,
        filter,
        empty,
    };

    if (setting && dexCards) {
        // The slots need every card, not a batch (getDexCards, kept per person); the names fill the
        // slots the binder has none of. The count and the value are the slots' own, as on the built-in
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
            <BinderPage {...common} datapoints={datapoints} pokedex={{ dex }}>
                {chips}
                {/* Why a slot can be grey for a card you own: the rarities this binder counts. */}
                <PokedexRarityNote binderId={binder.id} setting={setting} />
            </BinderPage>
        );
    }

    const cards = list!;
    const datapoints = cards.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced, listed: r.listed }));
    return (
        <BinderPage {...common} datapoints={datapoints} list={cards}>
            {chips}
        </BinderPage>
    );
}

function RuleChips({ rule, facets }: { rule: BinderRule; facets?: Facets }) {
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
async function RuleChipsWithTitles({ rule, facets }: { rule: BinderRule; facets: Promise<Facets> }) {
    return <RuleChips rule={rule} facets={await facets.catch(() => undefined)} />;
}
