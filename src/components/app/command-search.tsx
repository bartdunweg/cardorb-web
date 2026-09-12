"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type CatalogueFilters, type PokemonCard, addCard, listRows, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
import { listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import type { FilterOption } from "@/components/app/filter-chip";
import { SearchTrigger } from "@/components/app/search-trigger";
import { notify } from "@/components/app/toast";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { updateRecentCards, useRecentCards } from "@/hooks/use-recent-cards";
import { type Card, cardFromPokemonCard } from "@/lib/api-shapes";
import { loadCatalogueIndex, lookupCards } from "@/lib/catalogue-client";
import { searchIndex } from "@/lib/catalogue-index";
import type { BrowseLanguage } from "@/lib/languages";
import { hitFromRows, takenHit } from "@/lib/search-hit";

/** What one answer from the catalogue search holds at most: the API's page. A full one means there may be more. */
const SEARCH_PAGE_SIZE = 20;

// The palette itself, with the kit's command menu and its react-aria dialog behind it, loads the
// first time someone opens it: every dashboard screen carries the provider, few carry a search.
const CommandSearchMenu = dynamic(() => import("@/components/app/command-search-menu").then((m) => m.CommandSearchMenu), { ssr: false });

// The card sheet the preview's View details opens, fetched on that press: it is the app's largest client chunk.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

const CommandSearchContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandSearch = () => useContext(CommandSearchContext);

// A search-field-looking button that opens the command palette (used in the desktop sidebar).
export function SidebarSearchTrigger() {
    const { open } = useCommandSearch();
    return <SearchTrigger label="Search" shortcut="/" onPress={open} />;
}

// The same button at the top of Home on a phone, a size up: the row Home starts with. It opens the
// one palette, as the sidebar's trigger and Add card do. It used to open a sheet of its own that
// searched the collection and listed every set, a second search with a different shape from the
// palette Add card opened on the page beside it (Bart's call, 2026-09-11: one search, everywhere).
export function PhoneSearchTrigger({ className }: { className?: string }) {
    const { open } = useCommandSearch();
    return <SearchTrigger size="md" label="Search a card" onPress={open} className={className} />;
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
    /* The English catalogue, in the browser: fetched the first time the palette is wanted (a day
       in the HTTP cache after that) and searched here, so typing is answered before a request
       could have left. Until it is in hand, and on the other shelves, the API is asked as before.
       What the document does not know — owned, wishlist, the price — is looked up for the hits
       on screen once they are (below). */
    const [inBrowser, setInBrowser] = useState(false);
    useEffect(() => {
        if (!wanted) return;
        loadCatalogueIndex().then((found) => setInBrowser(Boolean(found)));
    }, [wanted]);
    const search = async (term: string, params: CatalogueFilters, page: number) => {
        if ((params.language ?? "en") === "en") {
            const index = await loadCatalogueIndex();
            if (index) return searchIndex(index, term, { set: params.set, type: params.type }, page);
        }
        return searchPokemon(term, params, page);
    };
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
    } = useDebouncedSearch<PokemonCard, CatalogueFilters>(inputValue, search, {
        minLength: 2,
        // A search in memory can follow the typing closely; one that leaves waits for the pause.
        delay: inBrowser && language === "en" ? 80 : 300,
        params: filters,
        pageSize: SEARCH_PAGE_SIZE,
    });
    /* The marks and the price for the hits the document found, from the API, once per hit per
       question: what is yours and what it costs are the two things the document cannot say.
       Asked after the hits are shown, so they never wait on it; a lookup that fails leaves the
       hits as they are, unmarked, which is what a search result without them has always been. */
    const lookedUp = useRef<Set<string>>(new Set());
    useEffect(() => {
        if (!inBrowser || language !== "en" || loading) return;
        const ids = hits.filter((h) => !lookedUp.current.has(h.id)).map((h) => h.id);
        if (!ids.length) return;
        for (const id of ids) lookedUp.current.add(id);
        lookupCards(ids)
            .then((known) => {
                const byId = new Map(known.map((c) => [c.id, c]));
                update((current) => current.map((h) => byId.get(h.id) ?? h));
            })
            .catch(() => {
                for (const id of ids) lookedUp.current.delete(id);
            });
        // Only when hits land: the ids are what the lookup is for.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hits, loading]);
    useEffect(() => {
        // A new question starts the marks over: a hit found twice is looked up twice, once per answer.
        lookedUp.current = new Set();
    }, [inputValue, filters]);
    /* The palette's recent cards carry the marks they had when last looked at. Opening the palette
       asks the API once what is held now and corrects them in place (use-recent-cards.ts); a
       lookup that fails leaves them as they were. */
    const recent = useRecentCards();
    useEffect(() => {
        if (!isOpen || !recent.length) return;
        lookupCards(recent.map((c) => c.id))
            .then(updateRecentCards)
            .catch(() => {});
        // Once per opening: the marks are read for the cards kept at that moment.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

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
            // The same mark on the recent copy of the card, where there is one.
            updateRecentCards(takenHit([card], card.id, target));
            // The list the card went to is behind the palette, and the first one turns Home from the
            // welcome into the stats without anyone seeing it happen: the one line that says it landed.
            notify.done(`${card.name} added to your ${target}`);
            router.refresh();
        } else {
            // The buttons come back as they were, which reads as a missed click; the toast is the
            // only thing that says the card is not there.
            notify.failed(`${card.name} was not added to your ${target}`, { description: res.error });
        }
    };

    /* View details, in the preview: the card's full sheet over the palette, with its price line and
       everything the preview has no room for (Bart's call, 2026-09-11: the preview is a preview, the
       sheet is the card). The palette stays behind it with the hits, so closing the sheet is back
       at the search. A hit you hold opens on its row, as a set tile does: the row carries the
       copies, the price paid and the id every action in the sheet's bar needs. It is read after the
       sheet opens on the catalogue's card, so the sheet is never blank waiting, and kept with the
       hit it was read for. */
    const [viewed, setViewed] = useState<PokemonCard | null>(null);
    const [row, setRow] = useState<{ of: string; row: Card } | null>(null);
    const view = async (hit: PokemonCard) => {
        setViewed(hit);
        // Read for every hit, marked or not: the marks arrive a beat after the hits (the lookup above),
        // and a held card pressed before they land would open as one nobody holds (measured).
        const rows = await listRows({ set: hit.set, number: hit.number, name: hit.name });
        if (rows[0]) setRow({ of: hit.id, row: rows[0] });
    };
    const held = viewed && row?.of === viewed.id ? row.row : null;
    /* Closing a sheet that opened on a row re-reads the rows for that hit: the sheet may have
       removed the card or a copy, and the hits are read by nobody else. A card taken from a hit
       nobody held is marked at once through onTaken instead, with no read. */
    const closeSheet = () => {
        const hit = viewed;
        setViewed(null);
        if (!hit || row?.of !== hit.id) return;
        listRows({ set: hit.set, number: hit.number, name: hit.name }).then((rows) => {
            update((hits) => hits.map((h) => (h.id === hit.id ? hitFromRows(h, rows) : h)));
            updateRecentCards([hitFromRows(hit, rows)]);
        });
    };

    /*
     * "/" opens the palette from anywhere on the page, as it does on GitHub and Linear. Only a
     * bare slash: one typed into a field or an editable element is text, and one with a
     * modifier is somebody else's shortcut. The trigger in the sidebar shows the key.
     */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
            const t = e.target;
            if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            e.preventDefault();
            setWanted(true);
            setIsOpen(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

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
                    onView={(hit) => void view(hit)}
                />
            ) : null}
            {/* Mounted from the first opening on and closed with a null card, as every list mounts it:
                a sheet unmounted on close cannot put focus back on the button that opened it. */}
            {wanted ? (
                <CardDetailSlideout
                    card={held ?? (viewed ? cardFromPokemonCard(viewed) : null)}
                    addable={viewed && !viewed.owned && !viewed.wishlist ? viewed : null}
                    onClose={closeSheet}
                    /* The hit the card came from says so at once, and so does its recent copy. */
                    onTaken={(card, list) => {
                        update((hits) => takenHit(hits, card.id, list));
                        updateRecentCards(takenHit([card], card.id, list));
                    }}
                />
            ) : null}
        </CommandSearchContext.Provider>
    );
}
