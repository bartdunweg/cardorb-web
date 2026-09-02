import { createClient } from "@/lib/supabase/server";

// National Pokédex size through Gen 9 (Scarlet/Violet + DLC).
export const NATIONAL_DEX_MAX = 1025;

export type DexCard = { id: string; name: string; imageUrl: string | null };
export type DexSlot = { number: number; cards: DexCard[] };

// One slot per Pokédex number (1..1025). A slot holds every owned card that maps to that number
// (tag-teams land under both); the UI shows a slider when there's more than one. Owned only.
// RLS also allows reading public profiles' cards, so the user filter is required (R-SEC-002).
export async function getPokedex(): Promise<{ slots: DexSlot[]; caughtNumbers: number; totalCards: number }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { slots: [], caughtNumbers: 0, totalCards: 0 };

    const { data, error } = await supabase
        .from("cards")
        .select("id, name, image_url, pokedex_numbers")
        .eq("user_id", user.id)
        .eq("wishlist", false)
        .eq("owned", true)
        .not("pokedex_numbers", "is", null)
        .order("set_name", { ascending: true, nullsFirst: false })
        .order("number", { ascending: true, nullsFirst: false });
    if (error) throw error;

    type Row = { id: string; name: string; image_url: string | null; pokedex_numbers: number[] | null };
    const byNumber = new Map<number, DexCard[]>();
    let totalCards = 0;
    for (const row of (data ?? []) as Row[]) {
        for (const n of row.pokedex_numbers ?? []) {
            if (n < 1 || n > NATIONAL_DEX_MAX) continue;
            if (!byNumber.has(n)) byNumber.set(n, []);
            byNumber.get(n)!.push({ id: row.id, name: row.name, imageUrl: row.image_url });
            totalCards++;
        }
    }

    const slots: DexSlot[] = Array.from({ length: NATIONAL_DEX_MAX }, (_, i) => ({ number: i + 1, cards: byNumber.get(i + 1) ?? [] }));
    return { slots, caughtNumbers: byNumber.size, totalCards };
}
