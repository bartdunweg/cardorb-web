"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type CatalogueFilters, type PokemonCard, addCard, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
import { listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import type { FilterOption } from "@/components/app/filter-chip";
import { SearchTrigger } from "@/components/app/search-trigger";
import { notify } from "@/components/app/toast";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { rememberSearch } from "@/hooks/use-recent-searches";
import type { BrowseLanguage } from "@/lib/languages";
import { takenHit } from "@/lib/search-hit";

/** What one answer from the catalogue search holds at most: the API's page. A full one means there may be more. */
const SEARCH_PAGE_SIZE = 20;

// The palette itself, with the kit's command menu and its react-aria dialog behind it, loads the
// first time someone opens it: every dashboard screen carries the provider, few carry a search.
const CommandSearchMenu = dynamic(() => import("@/components/app/command-search-menu").then((m) => m.CommandSearchMenu), { ssr: false });

const CommandSearchContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandSearch = () => useContext(CommandSearchContext);

// A search-field-looking button that opens the command palette (used in the desktop sidebar).
export function SidebarSearchTrigger() {
    const { open } = useCommandSearch();
    return <SearchTrigger label="Search" onPress={open} />;
}

// Renders the single command palette and provides open() to descendants. It searches the whole
// Pokémon card database (the Card Orb API, TCGdex behind it) and lets you add the highlighted hit
// to your collection or your wishlist from its preview, without leaving the palette.
export function CommandSearchProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    // True from the first open on: the menu stays mounted after, so closing still animates.
    const [wanted, setWanted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    // The chips under the field: a language, a set of that language's shelf and an energy type. All
    // go to the API's fielded search beside the term. Each shelf's sets are asked for once, the
    // first time that language is chosen (English on the first open), and kept.
    const [filters, setFilters] = useState<CatalogueFilters>({});
    const language: BrowseLanguage = filters.language ?? "en";
    const [shelves, setShelves] = useState<Partial<Record<BrowseLanguage, FilterOption[]>>>({});
    const sets = shelves[language];
    useEffect(() => {
        if (!wanted || sets) return;
        let live = true;
        listSetsShelf(language).then(({ series }) => {
            if (live)
                setShelves((known) => ({
                    ...known,
                    [language]: series.flatMap((group) => group.sets.map((set) => ({ value: set.name, label: set.name, hint: group.name }))),
                }));
        });
        return () => {
            live = false;
        };
    }, [wanted, sets, language]);
    const {
        results: hits,
        loading,
        failed,
        retry,
        hasMore,
        loadingMore,
        loadMore,
        total,
        update,
    } = useDebouncedSearch<PokemonCard, CatalogueFilters>(inputValue, searchPokemon, {
        minLength: 2,
        delay: 300,
        params: filters,
        pageSize: SEARCH_PAGE_SIZE,
    });
    // A term is kept once its search has found something, for the palette's empty state
    // (use-recent-searches.ts).
    useEffect(() => {
        if (!loading && hits.length) rememberSearch(inputValue);
        // Only when an answer lands: the term is what the answer is for.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, hits]);

    /* To the collection, or to the wishlist: the same card cannot be in both, so one press settles
       it. The hit is marked at once (takenHit), because the hits are this component's and no
       refresh re-reads them: the row under the closed preview would still offer the card as one
       you did not have. `adding` holds the hit whose add is in flight, so its buttons wait. */
    const [adding, setAdding] = useState<string | null>(null);
    const add = async (card: PokemonCard, target: "collection" | "wishlist") => {
        setAdding(card.id);
        const res = await addCard(card, target);
        setAdding(null);
        if (res.ok) {
            update((hits) => takenHit(hits, card.id, target));
            router.refresh();
        } else {
            // The buttons come back as they were, which reads as a missed click; the toast is the
            // only thing that says the card is not there.
            notify.failed(`${card.name} was not added to your ${target}`, { description: res.error });
        }
    };

    return (
        <CommandSearchContext.Provider
            value={{
                open: () => {
                    setWanted(true);
                    setIsOpen(true);
                },
            }}
        >
            {children}

            {wanted ? (
                <CommandSearchMenu
                    isOpen={isOpen}
                    onOpenChange={(o) => {
                        setIsOpen(o);
                        // An empty term and no chips clear the hits through the hook.
                        if (!o) {
                            setInputValue("");
                            setFilters({});
                        }
                    }}
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    filters={filters}
                    onFiltersChange={setFilters}
                    sets={sets ?? []}
                    hits={hits}
                    loading={loading}
                    failed={failed}
                    onRetry={retry}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={loadMore}
                    total={total}
                    adding={adding}
                    onAdd={add}
                />
            ) : null}
        </CommandSearchContext.Provider>
    );
}
