"use client";

import { useState } from "react";
import { DotsHorizontal, Settings01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { updateListPublic } from "@/app/(app)/dashboard/settings/actions";
import { notify } from "@/components/app/toast";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { forgetMineThenRefresh } from "@/lib/forget-then-refresh";

// A built-in list's settings, beside its title like a folder's: today one, whether the list shows
// on the public profile. Saved on the profile, so the phone and the desktop agree. Only the icon,
// as the plus beside it on the wishlist is.
// `compact`: the trigger is a dots button for the phone's bar, across from Back.
export function ListSettingsDialog({
    list,
    title,
    isPublic,
    compact,
}: {
    list: "wishlist" | "favorites";
    title: string;
    isPublic: boolean;
    compact?: boolean;
}) {
    const router = useRouter();
    const [shown, setShown] = useState(isPublic);
    // What was last saved from here, kept with the value the page had then: the dialog opened again
    // before the page has caught up shows the choice, not the page's older answer.
    const [saved, setSaved] = useState<{ shown: boolean; over: boolean } | null>(null);
    const current = saved && saved.over === isPublic ? saved.shown : isPublic;

    /* Closed on the press, with the toast, and written after: one switch is not a form to keep open
       for an answer, and Save spun through the write and then through the page drawn twice (inside
       the action's answer, and again by the refresh). A write that fails says so, and the dialog
       opens on the setting as it still is. */
    const save = (close: () => void) => {
        const next = shown;
        const tap = { shown: next, over: isPublic };
        setSaved(tap);
        close();
        // The whole of this setting lands on /user/[username]; this page looks the same either
        // way, so the toast is the only place the new state is ever said.
        notify.done(next ? `${title} shows on your public profile now` : `${title} no longer shows on your public profile`);
        const still = next ? `${title} still does not show on your public profile` : `${title} still shows on your public profile`;
        void updateListPublic({ list, shown: next }, { reread: false }).then(
            (res) => {
                if (!res.ok) {
                    setSaved((s) => (s === tap ? null : s));
                    notify.failed(still, { description: res.error });
                    return;
                }
                void forgetMineThenRefresh("profile", router);
            },
            () => {
                setSaved((s) => (s === tap ? null : s));
                notify.failed(still);
            },
        );
    };

    return (
        <DialogTrigger
            onOpenChange={(open) => {
                if (!open) return;
                setShown(current);
            }}
        >
            {compact ? (
                <Button color="secondary" size="lg" iconLeading={DotsHorizontal} aria-label={`${title} settings`} />
            ) : (
                <Button color="secondary" size="md" iconLeading={Settings01} aria-label={`${title} settings`}>
                    Settings
                </Button>
            )}
            <ModalOverlay>
                <Modal className="max-w-md">
                    <Dialog>
                        {({ close }) => (
                            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    {title} settings
                                </AriaHeading>
                                <Toggle
                                    label="Show on my public profile"
                                    hint="As a chip beside your binders on your page. Only while your profile is public."
                                    isSelected={shown}
                                    onChange={setShown}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button color="secondary" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button onClick={() => save(close)}>Save</Button>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
