import { api } from "@/lib/api";
import { type DexEntry, slotsFromEntries } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { DexCard, DexSlot } from "@/lib/api-shapes";

// National Pokédex size through Gen 9 (Scarlet/Violet + DLC).
export const NATIONAL_DEX_MAX = 1025;

// One slot per Pokédex number, each with the owned cards of that Pokémon as name and picture.
// The API decides which card is which Pokémon, from the catalogues rather than a stored number.
// Kept five minutes per person like the folders and the stats: the whole dex is the largest
// answer the API gives, it changes only when a card is added or removed, and every write drops
// the tag.
export async function getPokedex() {
    const entries = await perUser("pokedex", async (token) => (await api<{ entries: DexEntry[] }>("/pokedex", { token })).entries);
    return slotsFromEntries(entries);
}

/** Every Pokémon's name by national number, for the slots a folder has no card of. */
export async function getDexNames(): Promise<Map<number, string>> {
    const entries = await perUser("pokedex", async (token) => (await api<{ entries: DexEntry[] }>("/pokedex", { token })).entries);
    return new Map(entries.map((e) => [e.id, e.name]));
}
