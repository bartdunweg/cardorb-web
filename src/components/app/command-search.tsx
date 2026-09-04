"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type PokemonCard, addCard, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
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
            className="flex w-full pressable cursor-pointer items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm text-tertiary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2"
        >
            <SearchLg className="size-5 text-fg-quaternary" />
            <span className="flex-1 text-left">Search</span>
        </button>
    );
}

// Renders the single command palette and provides open() to descendants. It searches the whole
// Pokémon card database (pokemontcg) and lets you add a result to your collection.
export function CommandSearchProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    // True from the first open on: the menu stays mounted after, so closing still animates.
    const [wanted, setWanted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const { results: hits } = useDebouncedSearch<PokemonCard>(inputValue, searchPokemon, { minLength: 2, delay: 300 });
    const [status, setStatus] = useState<Record<string, AddStatus>>({});

    const add = async (card: PokemonCard) => {
        setStatus((s) => ({ ...s, [card.id]: "adding" }));
        const res = await addCard(card);
        if (res.ok) {
            setStatus((s) => ({ ...s, [card.id]: "added" }));
            router.refresh();
        } else {
            setStatus((s) => {
                const next = { ...s };
                delete next[card.id];
                return next;
            });
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
                        // An empty term clears the hits through the hook.
                        if (!o) setInputValue("");
                    }}
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    hits={hits}
                    status={status}
                    onAdd={add}
                />
            ) : null}
        </CommandSearchContext.Provider>
    );
}
