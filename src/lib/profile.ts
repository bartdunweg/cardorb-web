import { createClient } from "@/lib/supabase/server";

export type Profile = {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
    is_public: boolean;
};

// The signed-in user's profile plus their auth email. RLS (profiles_read) scopes this to the user.
export async function getMyProfile(): Promise<{ profile: Profile | null; email: string | null }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { profile: null, email: null };

    const { data } = await supabase.from("profiles").select("display_name, username, avatar_url, is_public").eq("id", user.id).single();

    return { profile: (data as Profile) ?? null, email: user.email ?? null };
}
