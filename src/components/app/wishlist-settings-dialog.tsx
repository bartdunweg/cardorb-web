"use client";

import { useState } from "react";
import { Settings01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { updateWishlistPublic } from "@/app/(app)/dashboard/settings/actions";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";

// The wishlist's settings, beside its title like a folder's: today one, whether the wishlist shows
// on the public profile. Saved on the profile, so the phone and the desktop agree. Only the icon
// on a phone, where the plus beside it is an icon too.
export function WishlistSettingsDialog({ isPublic }: { isPublic: boolean }) {
    const router = useRouter();
    const [shown, setShown] = useState(isPublic);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (close: () => void) => {
        setSaving(true);
        setError(null);
        const res = await updateWishlistPublic(shown);
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        close();
        router.refresh();
    };

    return (
        <DialogTrigger>
            <Button color="secondary" iconLeading={Settings01} aria-label="Wishlist settings" />
            <ModalOverlay>
                <Modal className="max-w-md">
                    <Dialog>
                        {({ close }) => (
                            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Wishlist settings
                                </AriaHeading>
                                <Toggle
                                    label="Show on my public profile"
                                    hint="The cards you are looking for, as a tab on your page. Only when your profile is public."
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
