import { Suspense } from "react";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { PokedexSettingsDialog } from "@/components/app/pokedex-settings-dialog";
import { type CardFilter, type Facets, getAllMyCards } from "@/lib/cards";
import { type DexList, groupByDex } from "@/lib/dex-groups";
import { DEFAULT_POKEDEX } from "@/lib/folder-rule";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";
import { getMyProfile } from "@/lib/profile";

// The built-in Pokédex: every card you own, shown as a Pokédex, with the setting from your profile:
// the range you collect and whether the missing ones show.
//
// The slots need every card, and reading them all takes longest of any list; so the read is not
// awaited. The title, the setting and the row are drawn at once, and the slots, the count and the
// progress bar take their places when the last page of cards is in.
export default async function PokedexPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, unpriced } = query;
    const filter: CardFilter = { q, sort, order, set, rarity, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    const me = await getMyProfile();
    const setting = me.profile?.pokedex ?? DEFAULT_POKEDEX;

    // One read of every card, not awaited: the slots, the count and the Filters sheet's facets all come from it.
    const all = getAllMyCards(filter);
    const facets = all.then((r) => r.facets);
    const dex: Promise<DexList> = Promise.all([all, getDexNames()]).then(([r, names]) => ({
        ...groupByDex(r.cards, names, setting),
        total: r.total,
        value: r.value,
        unpriced: r.unpriced,
    }));
    const datapoints = dex.then((d) => ({
        total: d.total,
        narrowed,
        value: d.value,
        unpriced: d.unpriced,
        caught: { of: d.caught, total: d.range.to - d.range.from + 1 },
    }));

    return (
        <FolderPage
            title="Pokédex"
            datapointLines={2}
            back={{ href: "/dashboard/collections", label: "Collection" }}
            datapoints={datapoints}
            settings={(compact) => (
                <Suspense
                    fallback={<PokedexSettingsDialog setting={setting} isPublic={me.profile?.pokedex_public ?? false} facets={NO_FACETS} compact={compact} />}
                >
                    <SettingsWhenReady setting={setting} isPublic={me.profile?.pokedex_public ?? false} facets={facets} compact={compact} />
                </Suspense>
            )}
            query={query}
            basePath="/dashboard/pokedex"
            facets={facets}
            filter={filter}
            empty={
                <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                    <AddCardModal />
                </AppEmptyState>
            }
            pokedex={{ dex }}
        />
    );
}

const NO_FACETS: Facets = { sets: [], rarities: [] };

// The dialog with the rarities it lists, once the list has said which there are.
async function SettingsWhenReady({ facets, ...rest }: { facets: Promise<Facets> } & Omit<Parameters<typeof PokedexSettingsDialog>[0], "facets">) {
    return <PokedexSettingsDialog {...rest} facets={await facets} />;
}
