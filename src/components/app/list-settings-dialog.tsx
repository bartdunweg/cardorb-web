"use client";

import { useState } from "react";
import { DotsHorizontal, Settings01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { updateListPublic } from "@/app/(app)/dashboard/settings/actions";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";

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
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (close: () => void) => {
        setSaving(true);
        setError(null);
        const res = await updateListPublic({ list, shown });
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        close();
        router.refresh();
    };

    return (
        <DialogTrigger
            onOpenChange={(open) => {
                if (!open) return;
                setShown(isPublic);
                setError(null);
            }}
        >
            {compact ? (
                <Button color="secondary" size="sm" iconLeading={DotsHorizontal} aria-label={`${title} settings`} />
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
                                    hint="As a chip beside your folders on your page. Only while your profile is public."
                                    isSelected={shown}
                                    onChange={setShown}
                                />
                                {error ? (
                                    <p role="alert" className="text-sm text-error-primary">
                                        {error}
                                    </p>
                                ) : null}
                                <div className="flex justify-end gap-2">
                                    <Button color="secondary" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button onClick={() => save(close)} isLoading={saving}>
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
