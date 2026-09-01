import { createClient } from "@/lib/supabase/server";

export type Card = {
    id: string;
    name: string;
    set_name: string | null;
    number: string | null;
    rarity: string | null;
    gen: string | null;
    types: string[] | null;
    quantity: number | null;
    owned: boolean | null;
    is_favorite: boolean | null;
    condition: string | null;
    grade: string | null;
    finish: string | null;
    purchase_price: number | null;
    purchase_date: string | null;
    acquired_at: string | null;
    notes: string | null;
    image_url: string | null;
    tcg_id: string | null;
    collection_id: string | null;
    wishlist: boolean | null;
};

export const CARD_COLUMNS =
    "id, name, set_name, number, rarity, gen, types, quantity, owned, is_favorite, condition, grade, finish, purchase_price, purchase_date, acquired_at, notes, image_url, tcg_id, collection_id, wishlist";

// Fetches the signed-in user's cards, optionally filtered by search term, collection, or favorites.
// RLS on `cards` (user_id = auth.uid()) scopes this to the current user.
export async function getMyCards({
    limit = 100,
    offset = 0,
    q,
    collectionId,
    favoritesOnly,
    wishlist = false,
}: { limit?: number; offset?: number; q?: string; collectionId?: string; favoritesOnly?: boolean; wishlist?: boolean } = {}): Promise<{
    cards: Card[];
    total: number;
}> {
    const supabase = await createClient();

    // Scope to the current user. RLS also allows reading public profiles' cards, so without this
    // filter "my collection" would leak every public user's cards.
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { cards: [], total: 0 };

    let query = supabase.from("cards").select(CARD_COLUMNS, { count: "exact" }).eq("user_id", user.id).eq("wishlist", wishlist);

    if (collectionId) query = query.eq("collection_id", collectionId);
    if (favoritesOnly) query = query.eq("is_favorite", true);

    const term = q?.trim();
    if (term) {
        // Escape PostgREST or-filter separators/wildcards in user input.
        const safe = term.replace(/[%,()]/g, " ");
        query = query.or(`name.ilike.%${safe}%,set_name.ilike.%${safe}%`);
    }

    const { data, count, error } = await query
        .order("set_name", { ascending: true, nullsFirst: false })
        .order("number", { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;

    return { cards: (data ?? []) as Card[], total: count ?? 0 };
}

export type CardStats = { owned: number; wishlist: number; favorites: number };

// Cheap head-count queries (no rows fetched), all RLS-scoped to the current user.
// The collection is owned cards; the wishlist is a separate category.
export async function getCardStats(): Promise<CardStats> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { owned: 0, wishlist: 0, favorites: 0 };

    const base = () => supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    const [owned, wishlist, favorites] = await Promise.all([
        base().eq("wishlist", false).eq("owned", true),
        base().eq("wishlist", true),
        base().eq("wishlist", false).eq("is_favorite", true),
    ]);

    return {
        owned: owned.count ?? 0,
        wishlist: wishlist.count ?? 0,
        favorites: favorites.count ?? 0,
    };
}
