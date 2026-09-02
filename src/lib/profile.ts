import { cache } from "react";
import { api } from "@/lib/api";
import { type OwnProfile, type Profile, profileFromOwn } from "@/lib/api-shapes";

export type { Profile } from "@/lib/api-shapes";

// The signed-in person's profile and email, from the API. Once per request: the layout asks on
// every screen and Settings asks again.
export const getMyProfile = cache(async (): Promise<{ profile: Profile | null; email: string | null }> => {
    const own = await api<OwnProfile>("/profile");
    return { profile: profileFromOwn(own), email: own.email };
});
