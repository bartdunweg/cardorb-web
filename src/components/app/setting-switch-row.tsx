"use client";

import { type FC, type ReactNode, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/(app)/dashboard/settings/actions";
import { notify } from "@/components/app/toast";
import { Toggle } from "@/components/base/toggle/toggle";
import type { ForgetWrite } from "@/lib/cache-scopes";
import { forgetMineThenRefresh } from "@/lib/forget-then-refresh";
import { orFailed } from "@/lib/write-outcome";
import { cx } from "@/utils/cx";

/**
 * A setting that is a switch, on the settings page itself: the settings-rows shape with the
 * switch in the chevron's place, and a flip that saves at once.
 *
 * The switch is the kit's Toggle without its own words: the label and the line under it sit
 * beside the icon, where every other row keeps them, and the switch is named by them
 * (`aria-labelledby`) and described by the line (`aria-describedby`), so a screen reader hears
 * "Public profile, cardorb.com/user/…, on". Toggle's own `label` would put the line inside the
 * switch's <label>, and a link inside a label is a control inside a control.
 *
 * While it saves the switch is read-only rather than disabled: it stays in the tab order and
 * keeps its name, and only refuses a second flip until the first has landed. A save that fails
 * puts the switch back and says so in a toast, titled by what the setting still is.
 *
 * Landed means the write, not the page: the write forgets nothing itself (`reread: false`), so the
 * switch is no longer held while the settings page is drawn inside the action's answer and then
 * drawn again by the refresh. The cache is dropped quietly and the page drawn once, behind it.
 */
export function SettingSwitchRow({
    icon: Icon,
    label,
    line,
    isSelected,
    isDisabled = false,
    onChange,
    save,
    forgets,
    stillTitle,
}: {
    icon: FC<{ className?: string; "aria-hidden"?: boolean | "true" }>;
    label: string;
    /** The line under the label: what the setting means as it stands. */
    line: ReactNode;
    isSelected: boolean;
    isDisabled?: boolean;
    /** The setting as the page holds it; flipped before the save, and back when it fails. */
    onChange: (next: boolean) => void;
    /** The write, told not to re-read: the row drops the cache itself. */
    save: (next: boolean, options: { reread: boolean }) => Promise<ActionResult>;
    /** What the write changed, for the cache it drops (`cache-scopes.ts`). */
    forgets: ForgetWrite;
    /** The failed toast's title, by the value the setting still has. */
    stillTitle: (still: boolean) => string;
}) {
    const router = useRouter();
    const labelId = useId();
    const lineId = useId();
    const [pending, setPending] = useState(false);

    const flip = async (next: boolean) => {
        if (pending) return;
        const before = isSelected;
        onChange(next);
        setPending(true);
        const res = await orFailed(save(next, { reread: false }));
        setPending(false);
        if (!res.ok) {
            onChange(before);
            notify.writeFailed(stillTitle(before), res);
            return;
        }
        // Whatever else reads the profile from the server (the Manage sheet, the account menu) gets the new one.
        void forgetMineThenRefresh(forgets, router);
    };

    return (
        <div className="flex w-full items-center gap-3 px-4 py-3.5 not-last:border-b not-last:border-secondary">
            <Icon aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />
            <div className="flex min-w-0 flex-1 flex-col">
                <span id={labelId} className="truncate text-md text-primary">
                    {label}
                </span>
                {/* Wrapped, not cut: the public profile's address has to be readable whole on a phone. */}
                <span id={lineId} className="text-sm wrap-anywhere text-tertiary">
                    {line}
                </span>
            </div>
            <Toggle
                aria-labelledby={labelId}
                aria-describedby={lineId}
                aria-busy={pending || undefined}
                isSelected={isSelected}
                isDisabled={isDisabled}
                isReadOnly={pending}
                onChange={flip}
                className={cx("shrink-0", pending && "opacity-70")}
            />
        </div>
    );
}
