import { Suspense } from "react";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { DexProgress } from "@/components/app/dex-progress";
import { FolderPage } from "@/components/app/folder-page";
import { PokedexSettingsDialog } from "@/components/app/pokedex-settings-dialog";
import { type CardFilter, getAllMyCards, getFacets } from "@/lib/cards";
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
    const { q, sort, order, set, rarity } = query;
    const filter: CardFilter = { q, sort, order, set, rarity };
    const narrowed = isNarrowed(query);
    const [me, facets] = await Promise.all([getMyProfile(), getFacets()]);
    const setting = me.profile?.pokedex ?? DEFAULT_POKEDEX;

    const dex: Promise<DexList> = Promise.all([getAllMyCards(filter), getDexNames()]).then(([r, names]) => ({
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
            back={{ href: "/dashboard/collections", label: "Folders" }}
            datapoints={datapoints}
            actions={<PokedexSettingsDialog setting={setting} />}
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
        >
            <Suspense fallback={null}>
                <DexProgress dex={dex} label="Pokédex completion" />
            </Suspense>
        </FolderPage>
    );
}
