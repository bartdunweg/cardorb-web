"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { type CatalogueFilters, type PokemonCard, listRows, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
import { listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import type { FilterOption } from "@/components/app/filter-chip";
import { SearchTrigger } from "@/components/app/search-trigger";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { rememberSearch } from "@/hooks/use-recent-searches";
import { type Card, cardFromPokemonCard } from "@/lib/api-shapes";
import type { BrowseLanguage } from "@/lib/languages";
import { hitFromRows, takenHit } from "@/lib/search-hit";

/** What one answer from the catalogue search holds at most: the API's page. A full one means there may be more. */
const SEARCH_PAGE_SIZE = 20;

// The palette itself, with the kit's command menu and its react-aria dialog behind it, loads the
// first time someone opens it: every dashboard screen carries the provider, few carry a search.
const CommandSearchMenu = dynamic(() => import("@/components/app/command-search-menu").then((m) => m.CommandSearchMenu), { ssr: false });
// The card sheet a pressed hit opens, fetched on that press: it is the app's largest client chunk.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

/**
 * What the palette was opened for. Search from the sidebar has none: a hit's sheet offers the
 * collection and the wishlist alike. Add card on a page opens the same palette with the page's
 * side of the choice already made — the wishlist page's puts the wishlist first, a manual binder's
 * files the card in that binder — so there is one place to search and add, not two (Bart's call,
 * 2026-09-11; the Add dialog that did the same with fewer filters and no preview went).
 */
export type AddIntent = {
    target: "collection" | "wishlist";
    /** A manual binder the card goes into, and its name for the button. */
    collectionId?: string;
    collectionName?: string;
};

const CommandSearchContext = createContext<{ open: (intent?: AddIntent) => void }>({ open: () => {} });
export const useCommandSearch = () => useContext(CommandSearchContext);

// A search-field-looking button that opens the command palette (used in the desktop sidebar).
export function SidebarSearchTrigger() {
    const { open } = useCommandSearch();
    return <SearchTrigger label="Search" onPress={() => open()} />;
}

// Renders the single command palette and provides open() to descendants. It searches the whole
// Pokémon card database (the Card Orb API, TCGdex behind it); a hit opens the card's sheet, which
// is where it is added to the collection or the wishlist.
export function CommandSearchProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [intent, setIntent] = useState<AddIntent | null>(null);
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

    /* The hit whose sheet is open over the palette: the card in full, with its price line and the
       two ways to take it, the same sheet a set page opens on a card nobody holds. The palette stays
       behind it with the hits, so closing the sheet is back at the search. */
    const [opened, setOpened] = useState<PokemonCard | null>(null);
    /* A hit you hold opens on its row, as a set tile does: the row carries the copies, the price
       paid and the id every action in the sheet's bar needs. Read after the sheet opens on the
       catalogue's card, so it is never blank waiting; kept with the hit it was read for. It was
       missing, and "Remove from wishlist" on a wished hit answered "Invalid card" (measured). */
    const [row, setRow] = useState<{ of: string; row: Card } | null>(null);
    const open = async (hit: PokemonCard) => {
        setOpened(hit);
        if (!hit.owned && !hit.wishlist) return;
        const rows = await listRows({ set: hit.set, number: hit.number, name: hit.name });
        if (rows[0]) setRow({ of: hit.id, row: rows[0] });
    };
    const held = opened && row?.of === opened.id ? row.row : null;
    /* Closing a sheet that opened on a row re-reads the rows for that hit: the sheet may have
       removed the card or a copy, and the hits are read by nobody else. A card taken from a hit
       nobody held is marked at once through onTaken instead, with no read. */
    const close = () => {
        const hit = opened;
        setOpened(null);
        if (!hit || row?.of !== hit.id) return;
        listRows({ set: hit.set, number: hit.number, name: hit.name }).then((rows) =>
            update((hits) => hits.map((h) => (h.id === hit.id ? hitFromRows(h, rows) : h))),
        );
    };

    return (
        <CommandSearchContext.Provider
            value={{
                open: (next) => {
                    setIntent(next ?? null);
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
                            setIntent(null);
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
                    onOpen={(hit) => void open(hit)}
                />
            ) : null}
            {/* Mounted from the first press on and closed with a null card, as every list mounts it: a
                sheet unmounted on close cannot put focus back on the hit that opened it, and a keyboard
                user landed on the page under the palette (measured). */}
            {wanted ? (
                <CardDetailSlideout
                    card={held ?? (opened ? cardFromPokemonCard(opened) : null)}
                    addable={opened && !opened.owned && !opened.wishlist ? opened : null}
                    addInto={intent}
                    onClose={close}
                    /* The hit the card came from says so at once: the hits are this component's, and no
                       refresh re-reads them. */
                    onTaken={(card, list) => update((hits) => takenHit(hits, card.id, list))}
                />
            ) : null}
        </CommandSearchContext.Provider>
    );
}
