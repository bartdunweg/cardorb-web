import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { PokedexSettingsDialog } from "@/components/app/pokedex-settings-dialog";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { getAllMyCards } from "@/lib/cards";
import { groupByDex } from "@/lib/dex-groups";
import { DEFAULT_POKEDEX } from "@/lib/folder-rule";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";
import { getMyProfile } from "@/lib/profile";

// The built-in Pokédex: every card you own, shown as a Pokédex, with the setting from your profile:
// the range you collect and whether the missing ones show.
export default async function PokedexPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity } = query;
    const [{ cards, total, facets, value, unpriced }, names, me] = await Promise.all([
        getAllMyCards({ q, sort, order, set, rarity }),
        getDexNames(),
        getMyProfile(),
    ]);
    const setting = me.profile?.pokedex ?? DEFAULT_POKEDEX;
    const dex = groupByDex(cards, names, setting);
    const span = dex.range.to - dex.range.from + 1;

    return (
        <FolderPage
            title="Pokédex"
            back={{ href: "/dashboard/collections", label: "Folders" }}
            datapoints={{ total, narrowed: isNarrowed(query), value, unpriced, caught: { of: dex.caught, total: span } }}
            actions={<PokedexSettingsDialog setting={setting} />}
            query={query}
            basePath="/dashboard/pokedex"
            facets={facets}
            cards={cards}
            total={total}
            empty={
                <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                    <AddCardModal />
                </AppEmptyState>
            }
            pokedex={{ slots: dex.slots }}
        >
            <ProgressBarBase value={dex.caught} max={span} className="mt-2 max-w-md" aria-label="Pokédex completion" />
        </FolderPage>
    );
}
