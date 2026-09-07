import { api } from "@/lib/api";
import { pokedexAnswer } from "@/lib/api-shapes";
import type { DexEntry } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

/**
 * Every Pokémon's name by national number, for the slots a folder has no card of. The API decides
 * which card is which Pokémon, from the catalogues rather than a stored number. Kept five minutes
 * per person like the folders and the stats; every write drops the tag.
 */
export async function getDexNames(): Promise<Map<number, string>> {
    const entries = await perUser("pokedex", async (token) => (await api("/pokedex", { token, schema: pokedexAnswer })).entries);
    return new Map(entries.map((e) => [e.id, e.name]));
}
