import { Suspense } from "react";
import type { Metadata } from "next";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { PokedexRarityNote } from "@/components/app/pokedex-rarity-note";
import { PokedexSettingsDialog } from "@/components/app/pokedex-settings-dialog";
import { type CardFilter, getAllMyCards } from "@/lib/cards";
import { type DexList, groupByDex } from "@/lib/dex-groups";
import { type Facets, NO_FACETS } from "@/lib/facets";
import { DEFAULT_POKEDEX } from "@/lib/folder-rule";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getDexNames } from "@/lib/pokedex";
import { getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Pokédex" };

// The built-in Pokédex: every card you own, shown as a Pokédex, with the setting from your profile:
// the range you collect and whether the missing ones show.
//
// The slots need every card, and reading them all takes longest of any list; so the read is not
// awaited. The title, the setting and the row are drawn at once, and the slots, the count and the
// progress bar take their places when the last page of cards is in.
export default async function PokedexPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, gen, type, unpriced } = query;
    const filter: CardFilter = { q, sort, order, set, rarity, gen, type, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    const me = await getMyProfile();
    const setting = me.profile?.pokedex ?? DEFAULT_POKEDEX;

    // One read of every card, not awaited: the slots, the count and the Filters sheet's facets all come from it.
    // The count, the value and the number in the sidebar are the slots' own (getPokedexCount): the
    // Pokédex is a binder with a rule, and says what the rule keeps, not what the read returned.
    const all = getAllMyCards(filter);
    const facets = all.then((r) => r.facets);
    const dex: Promise<DexList> = Promise.all([all, getDexNames()]).then(([r, names]) => {
        const grouped = groupByDex(r.cards, names, setting);
        return { ...grouped, total: grouped.cards };
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
        <FolderPage
            title="Pokédex"
            datapointLines={2}
            back={{ href: "/dashboard/collections", label: "Binders" }}
            datapoints={datapoints}
            settings={(compact) => (
                <Suspense
                    fallback={
                        <PokedexSettingsDialog
                            setting={setting}
                            isPublic={me.profile?.pokedex_public ?? false}
                            facets={NO_FACETS}
                            facetsLoading
                            compact={compact}
                        />
                    }
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
                    <AddCardButton />
                </AppEmptyState>
            }
            pokedex={{ dex }}
        >
            <PokedexRarityNote setting={setting} />
        </FolderPage>
    );
}

// The dialog with the rarities it lists, once the list has said which there are.
async function SettingsWhenReady({ facets, ...rest }: { facets: Promise<Facets> } & Omit<Parameters<typeof PokedexSettingsDialog>[0], "facets">) {
    return <PokedexSettingsDialog {...rest} facets={await facets} />;
}
