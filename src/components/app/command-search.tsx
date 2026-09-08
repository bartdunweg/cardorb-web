"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type CatalogueFilters, type PokemonCard, addCard, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
import { listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import type { FilterOption } from "@/components/app/filter-chip";
import { notify } from "@/components/app/toast";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

export type AddStatus = "idle" | "adding" | "added";

// The palette itself, with the kit's command menu and its react-aria dialog behind it, loads the
// first time someone opens it: every dashboard screen carries the provider, few carry a search.
const CommandSearchMenu = dynamic(() => import("@/components/app/command-search-menu").then((m) => m.CommandSearchMenu), { ssr: false });

const CommandSearchContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandSearch = () => useContext(CommandSearchContext);

// A search-field-looking button that opens the command palette (used in the desktop sidebar).
export function SidebarSearchTrigger() {
    const { open } = useCommandSearch();
    return (
        <button
            type="button"
            onClick={open}
            className="flex w-full pressable cursor-pointer items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm text-tertiary ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2"
        >
            <SearchLg className="size-5 text-fg-quaternary" />
            <span className="flex-1 text-left">Search</span>
        </button>
    );
}

// Renders the single command palette and provides open() to descendants. It searches the whole
// Pokémon card database (the Card Orb API, TCGdex behind it) and lets you add a result to your collection.
export function CommandSearchProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    // True from the first open on: the menu stays mounted after, so closing still animates.
    const [wanted, setWanted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    // The chips under the field: a set from the English catalogue (asked for on the first open, once)
    // and an energy type. Both go to the API's fielded search beside the term.
    const [filters, setFilters] = useState<CatalogueFilters>({});
    const [sets, setSets] = useState<FilterOption[] | null>(null);
    useEffect(() => {
        if (!wanted || sets) return;
        let live = true;
        listSetsShelf("en").then(({ series }) => {
            if (live) setSets(series.flatMap((group) => group.sets.map((set) => ({ value: set.name, label: set.name, hint: group.name }))));
        });
        return () => {
            live = false;
        };
    }, [wanted, sets]);
    const { results: hits, loading } = useDebouncedSearch<PokemonCard, CatalogueFilters>(inputValue, searchPokemon, {
        minLength: 2,
        delay: 300,
        params: filters,
    });
    const [status, setStatus] = useState<Record<string, AddStatus>>({});

    const add = async (card: PokemonCard) => {
        setStatus((s) => ({ ...s, [card.id]: "adding" }));
        const res = await addCard(card);
        if (res.ok) {
            setStatus((s) => ({ ...s, [card.id]: "added" }));
            router.refresh();
        } else {
            // The row goes back to "Add", which reads as a missed click; the toast is the only
            // thing that says the card is not there.
            setStatus((s) => {
                const next = { ...s };
                delete next[card.id];
                return next;
            });
            notify.failed(`${card.name} was not added to your collection`, { description: res.error });
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
                    status={status}
                    onAdd={add}
                />
            ) : null}
        </CommandSearchContext.Provider>
    );
}
