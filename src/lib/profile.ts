import { ApiError, api, session } from "@/lib/api";
import { type OwnProfile, type Profile, profileFromOwn } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { Profile } from "@/lib/api-shapes";

// The signed-in person's profile and email, from the API. Kept five minutes per person: the
// layout asks on every screen, and it only changes on Settings, which drops the cache.
export async function getMyProfile(): Promise<{ profile: Profile | null; email: string | null }> {
    const own = await perUser("profile", (token) => api<OwnProfile>("/profile", { token }));
    return { profile: profileFromOwn(own), email: own.email };
}

/** What the account menu shows: a name to greet with, the email, the picture. */
export type Account = { name: string; email: string; avatarUrl: string | null };

export function accountFrom(me: { profile: Profile | null; email: string | null }): Account {
    return {
        name: me.profile?.display_name || me.profile?.username || me.email?.split("@")[0] || "Account",
        email: me.email ?? "",
        avatarUrl: me.profile?.avatar_url ?? null,
    };
}

/**
 * The signed-in viewer of a page anyone can open, or null when nobody is signed in. A visitor
 * without a session cookie costs no call; a session the API no longer accepts counts as nobody.
 */
export async function getViewer(): Promise<Account | null> {
    if (!(await session())) return null;
    try {
        return accountFrom(await getMyProfile());
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
    }
}
