import { api } from "@/lib/api";
import { type OwnProfile, type Profile, profileFromOwn } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { Profile } from "@/lib/api-shapes";

// The signed-in person's profile and email, from the API. Kept five minutes per person: the
// layout asks on every screen, and it only changes on Settings, which drops the cache.
export async function getMyProfile(): Promise<{ profile: Profile | null; email: string | null }> {
    const own = await perUser("profile", (token) => api<OwnProfile>("/profile", { token }));
    return { profile: profileFromOwn(own), email: own.email };
}
