"use client";

import { Globe01 } from "@untitledui/icons";
import { setProfilePublic } from "@/app/(app)/dashboard/settings/actions";
import { SettingSwitchRow } from "@/components/app/setting-switch-row";

/** The public page's address as a person would type it: the site's origin without its scheme. */
export function publicUrl(username: string): string {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cardorb.com";
    return `${site.replace(/^https?:\/\//, "")}/user/${username}`;
}

/**
 * Whether the profile is public, on the settings page itself.
 *
 * It was a toggle inside the Manage sheet and nowhere else, so the page never said whether the
 * collection could be seen by anyone: you opened a form to find out. Clay puts the switch and the
 * profile's address on the page, in view; so does this row. The sheet keeps its own copy of the
 * setting, for the person who is filling in the rest of the form anyway, and both read the same
 * state, so neither can disagree with the other.
 */
export function PublicProfileRow({
    username,
    isPublic,
    onChange,
}: {
    /** The saved username, or null while there is none: no name, no address, no switch. */
    username: string | null;
    isPublic: boolean;
    /** The setting as the page holds it; the Manage sheet reads the same value. */
    onChange: (isPublic: boolean) => void;
}) {
    return (
        <SettingSwitchRow
            icon={Globe01}
            label="Public profile"
            line={
                !username ? (
                    "Pick a username first"
                ) : isPublic ? (
                    <a
                        href={`/user/${encodeURIComponent(username)}`}
                        target="_blank"
                        rel="noopener"
                        className="rounded-xs text-secondary underline-offset-2 outline-focus-ring hover:underline focus-visible:outline-2"
                    >
                        {publicUrl(username)}
                        <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                ) : (
                    "Only you can see it"
                )
            }
            isSelected={isPublic}
            isDisabled={!username}
            onChange={onChange}
            save={setProfilePublic}
            forgets="profile"
            stillTitle={(still) => (still ? "Your profile is still public" : "Your profile is still private")}
        />
    );
}
