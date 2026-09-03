import { api } from "@/lib/api";
import { perUser } from "@/lib/user-cache";

/** The two lists a filter menu offers: the sets you hold a card of, and the rarities you hold. */
export type Facets = { sets: { name: string; title: string }[]; rarities: string[] };

type SetLike = { name: string; title: string; cards: { variants: { rarity: string | null; owned: boolean }[] }[] };

/** Pure: a set counts when one copy in it is owned; a rarity when one owned copy carries it. */
export function facetsFromSets(sets: SetLike[]): Facets {
    const rarities = new Set<string>();
    const held: { name: string; title: string }[] = [];
    for (const set of sets) {
        let owned = false;
        for (const card of set.cards) {
            for (const v of card.variants) {
                if (!v.owned) continue;
                owned = true;
                if (v.rarity) rarities.add(v.rarity);
            }
        }
        if (owned) held.push({ name: set.name, title: set.title || set.name });
    }
    held.sort((a, b) => a.title.localeCompare(b.title, "en"));
    return { sets: held, rarities: [...rarities].sort((a, b) => a.localeCompare(b, "en")) };
}

// From the grouped collection, which is the one answer that names every set. Kept five minutes
// per person like the layout's reads; a write drops it with the rest (forgetMine).
export const getFacets = (): Promise<Facets> =>
    perUser("facets", async (token) => facetsFromSets((await api<{ sets: SetLike[] }>("/collection", { token })).sets));
