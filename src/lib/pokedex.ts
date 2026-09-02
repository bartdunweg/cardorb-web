import { api } from "@/lib/api";
import { type DexEntry, slotsFromEntries } from "@/lib/api-shapes";

export type { DexCard, DexSlot } from "@/lib/api-shapes";

// National Pokédex size through Gen 9 (Scarlet/Violet + DLC).
export const NATIONAL_DEX_MAX = 1025;

// One slot per Pokédex number, each with the owned cards of that Pokémon as name and picture.
// The API decides which card is which Pokémon, from the catalogues rather than a stored number.
export async function getPokedex() {
    const { entries } = await api<{ entries: DexEntry[] }>("/pokedex");
    return slotsFromEntries(entries);
}
