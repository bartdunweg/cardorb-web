"use client";

import { useId, useState } from "react";
import { Globe01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { setProfilePublic } from "@/app/(app)/dashboard/settings/actions";
import { notify } from "@/components/app/toast";
import { Toggle } from "@/components/base/toggle/toggle";
import { cx } from "@/utils/cx";

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
 *
 * The row is the settings-rows shape with a switch in the chevron's place. The switch is the
 * kit's Toggle without its own words: the label and the line under it sit beside the icon, where
 * every other row keeps them, and the switch is named by them (`aria-labelledby`) and described by
 * the line (`aria-describedby`), so a screen reader hears "Public profile, cardorb.com/user/…, on".
 * Toggle's own `label` would put the address inside the switch's <label>, and a link inside a
 * label is a control inside a control.
 *
 * A flip saves at once. While it saves the switch is read-only rather than disabled: it stays in
 * the tab order and keeps its name, and only refuses a second flip until the first has landed.
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
    const router = useRouter();
    const labelId = useId();
    const lineId = useId();
    const [pending, setPending] = useState(false);

    const flip = async (next: boolean) => {
        if (pending) return;
        const before = isPublic;
        onChange(next);
        setPending(true);
        const res = await setProfilePublic(next).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
        setPending(false);
        if (!res.ok) {
            onChange(before);
            notify.failed(next ? "Your profile is still private" : "Your profile is still public", { description: res.error });
            return;
        }
        // The sheet and the sidebar's account menu read the profile from the server; give them the new one.
        router.refresh();
    };

    return (
        <div className="flex w-full items-center gap-3 px-4 py-3.5 not-last:border-b not-last:border-secondary">
            <Globe01 aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />
            <div className="flex min-w-0 flex-1 flex-col">
                <span id={labelId} className="truncate text-md text-primary">
                    Public profile
                </span>
                <span id={lineId} className="truncate text-sm text-tertiary">
                    {!username ? (
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
                    )}
                </span>
            </div>
            <Toggle
                aria-labelledby={labelId}
                aria-describedby={lineId}
                aria-busy={pending || undefined}
                isSelected={isPublic}
                isDisabled={!username}
                isReadOnly={pending}
                onChange={flip}
                className={cx("shrink-0", pending && "opacity-70")}
            />
        </div>
    );
}
