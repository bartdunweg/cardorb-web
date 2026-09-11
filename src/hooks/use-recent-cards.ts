"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { PokemonCard } from "@/lib/api-shapes";

/**
 * The last few cards opened from the palette, kept in this browser so it has something to offer
 * before a letter is typed: a card looked at is a card likely to be looked at again, where a
 * term only says what was typed (Bart's call, after v0 and Bonsai, whose palettes open on what
 * was last visited). Eight, newest first, and told about across tabs the way the theme is
 * (providers/theme.tsx): localStorage, a storage event, and an event of our own for this tab.
 * Nothing leaves the browser.
 *
 * What is kept is the catalogue's card as the palette had it. Whether you hold it is read again
 * when it is opened (command-search.tsx): that changes, the card does not.
 */
const STORAGE_KEY = "recent-cards";
const CHANGE_EVENT = "recent-cards-change";
export const MAX_RECENT_CARDS = 8;

/* The stored shape, checked on the way back in (R-DATA-001): what is in localStorage was
   written by us, but a version ago, or by nobody. A card missing a field is left out. */
const storedCard = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    set: z.string(),
    number: z.string(),
    rarity: z.string().nullable(),
    image: z.string().nullable(),
    supertype: z.string().nullable(),
    subtypes: z.array(z.string()).nullable(),
    hp: z.string().nullable(),
    types: z.array(z.string()).nullable(),
    artist: z.string().nullable(),
    series: z.string().nullable(),
    releaseDate: z.string().nullable(),
    setPrintedTotal: z.number().nullable(),
    flavorText: z.string().nullable(),
    nationalPokedexNumbers: z.array(z.number()).nullable(),
    tcgId: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    owned: z.boolean(),
    wishlist: z.boolean(),
    quantity: z.number(),
    price: z.number().nullable(),
}) satisfies z.ZodType<PokemonCard>;

const EMPTY: readonly PokemonCard[] = [];
// The snapshot must be the same array for the same stored value, or React re-renders forever.
let last: { raw: string | null; cards: readonly PokemonCard[] } = { raw: null, cards: EMPTY };

const readStored = (): readonly PokemonCard[] => {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        return EMPTY;
    }
    if (raw === last.raw) return last.cards;
    let cards: readonly PokemonCard[] = EMPTY;
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed))
            cards = parsed
                .map((c) => storedCard.safeParse(c))
                .flatMap((r) => (r.success ? [r.data] : []))
                .slice(0, MAX_RECENT_CARDS);
    } catch {
        /* not ours: nothing to offer */
    }
    last = { raw, cards };
    return cards;
};

const subscribe = (onChange: () => void) => {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
};

const write = (cards: readonly PokemonCard[]) => {
    try {
        if (cards.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* no storage: nothing to keep, the palette stays as it is */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

/** A card just opened, to the front; the same card again moves rather than doubles. */
export function rememberCard(card: PokemonCard) {
    const rest = readStored().filter((c) => c.id !== card.id);
    write([card, ...rest].slice(0, MAX_RECENT_CARDS));
}

/** What the collection says now about cards that are kept: the marks change, the order does not. */
export function updateRecentCards(known: readonly PokemonCard[]) {
    const byId = new Map(known.map((c) => [c.id, c]));
    const kept = readStored();
    if (!kept.some((c) => byId.has(c.id))) return;
    write(kept.map((c) => byId.get(c.id) ?? c));
}

export function clearRecentCards() {
    write(EMPTY);
}

/** The cards, newest first; empty on the server and in a browser that keeps nothing. */
export function useRecentCards(): readonly PokemonCard[] {
    return useSyncExternalStore(subscribe, readStored, () => EMPTY);
}
