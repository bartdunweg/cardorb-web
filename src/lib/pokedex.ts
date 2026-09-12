import { api } from "@/lib/api";
import { speciesAnswer } from "@/lib/api-shapes";
import type { DexSpecies } from "@/lib/dex-groups";

/**
 * Every Pokémon's name and official picture by national number, for the slots a binder has no
 * card of: the name says what to find, the picture shows it.
 *
 * From the catalogue route, which needs no session, and that is the whole point. This read
 * `/pokedex` before, which answers every slot *with how many cards the caller owns* and is
 * authorised for exactly that reason. On a public profile there is no caller: the read threw a
 * 401, the page swallowed it, and a stranger opening somebody's public Pokédex was shown "No
 * cards found" as though the collection were empty. The names are nobody's data, so they have
 * their own route now (cardorb-api#249).
 *
 * One answer for everybody, so it is not kept per person either.
 */
export async function getDexNames(): Promise<DexSpecies> {
    const { entries } = await api("/public/species", { auth: false, schema: speciesAnswer });
    return new Map(entries.map((e) => [e.id, { name: e.name, artwork: e.artwork_url ?? null }]));
}
