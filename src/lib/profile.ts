import { api, remembered } from "@/lib/api";
import { type OwnProfile, type Profile, profileFromOwn } from "@/lib/api-shapes";

export type { Profile } from "@/lib/api-shapes";

// The signed-in person's profile and email, remembered a minute (see remembered()).
export async function getMyProfile(): Promise<{ profile: Profile | null; email: string | null }> {
    const own = await remembered("profile", (token) => api<OwnProfile>("/profile", { token }));
    return { profile: profileFromOwn(own), email: own.email };
}
