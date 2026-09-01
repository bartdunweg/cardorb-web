import { createClient } from "@/lib/supabase/server";

export type CollectionSummary = { id: string; name: string; count: number };

// The user's collections with per-collection card counts, plus the favorites count. RLS-scoped.
export async function getMyCollections(): Promise<{ collections: CollectionSummary[]; favoritesCount: number; wishlistCount: number }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { collections: [], favoritesCount: 0, wishlistCount: 0 };

    const [cols, assigned, fav, wish] = await Promise.all([
        supabase.from("collections").select("id, name").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("cards").select("collection_id").eq("user_id", user.id).eq("wishlist", false).not("collection_id", "is", null),
        supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("wishlist", false).eq("is_favorite", true),
        supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("wishlist", true),
    ]);

    const counts = new Map<string, number>();
    for (const row of (assigned.data ?? []) as { collection_id: string | null }[]) {
        if (row.collection_id) counts.set(row.collection_id, (counts.get(row.collection_id) ?? 0) + 1);
    }

    const collections = ((cols.data ?? []) as { id: string; name: string }[]).map((c) => ({
        id: c.id,
        name: c.name,
        count: counts.get(c.id) ?? 0,
    }));

    return { collections, favoritesCount: fav.count ?? 0, wishlistCount: wish.count ?? 0 };
}

export async function getCollection(id: string): Promise<{ id: string; name: string } | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from("collections").select("id, name").eq("user_id", user.id).eq("id", id).maybeSingle();
    return (data as { id: string; name: string } | null) ?? null;
}
