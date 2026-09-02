import { CARD_COLUMNS, type Card } from "@/lib/cards";
import { createClient } from "@/lib/supabase/server";

export type PublicProfile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

// Looks up a public profile by username. Returns null when it doesn't exist or isn't public —
// RLS also enforces this (profiles are only readable when `is_public` or your own row).
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();
    return (data as PublicProfile | null) ?? null;
}

// The owned collection of a given user, for the public profile page. Scoped by user_id; RLS still
// gates it (only a public profile's cards are readable by an anonymous visitor).
export async function getPublicCards(userId: string): Promise<{ cards: Card[]; total: number }> {
    const supabase = await createClient();
    const { data, count, error } = await supabase
        .from("cards")
        .select(CARD_COLUMNS, { count: "exact" })
        .eq("user_id", userId)
        .eq("owned", true)
        .eq("wishlist", false)
        .order("set_name", { ascending: true, nullsFirst: false })
        .order("number", { ascending: true, nullsFirst: false })
        .limit(100);
    if (error) throw error;
    return { cards: (data ?? []) as Card[], total: count ?? 0 };
}
