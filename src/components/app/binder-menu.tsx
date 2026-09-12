"use client";

import { useState } from "react";
import { Edit03, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { deleteCollection } from "@/app/(app)/dashboard/collections/actions";
import { FolderModal } from "@/components/app/folder-dialog";
import { notify } from "@/components/app/toast";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { styles } from "@/components/base/buttons/button-styles";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { Facets } from "@/lib/cards";
import type { FolderKind, FolderRule, PokedexSetting } from "@/lib/folder-rule";
import { cx } from "@/utils/cx";

/**
 * The dots on a binder's page: what is done to the binder itself, one press further than the
 * plus that fills it. Edit is here too, not a button of its own beside the plus; Bart's call,
 * 2026-09-11. Deleting is the one thing that cannot be undone, and the confirm dialog stands.
 */
export function BinderMenu({
    folder,
    facets,
    compact,
}: {
    folder: { id: string; name: string; kind: FolderKind; rule: FolderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };
    facets: Facets;
    /** In the phone's bar, the size of Back beside it. */
    compact: boolean;
}) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const del = async () => {
        setDeleting(true);
        const res = await deleteCollection(folder.id);
        // On success the list you land on is the answer. On failure the dialog just sits there
        // with its button ready again, saying nothing.
        if (res.ok) router.push("/dashboard/collections");
        else {
            setDeleting(false);
            notify.failed(`${folder.name} was not deleted`, { description: res.error });
        }
    };

    return (
        <>
            <Dropdown.Root>
                {/* The kit's own trigger, as the design page's menu uses it: the menu opens from it by
                    mouse and by keyboard alike, which a kit Button standing in for it did not. It wears
                    the secondary pill's own classes, so it sits beside the plus as the same button. */}
                <Dropdown.DotsButton
                    className={cx(
                        styles.common.root,
                        styles.sizes[compact ? "lg" : "md"].root,
                        styles.colors.secondary.root,
                        "rounded-full before:rounded-full",
                        compact ? "p-3" : "p-2.5",
                    )}
                />
                <Dropdown.Popover className="w-56">
                    <Dropdown.Menu>
                        <Dropdown.Item icon={Edit03} onAction={() => setEditing(true)}>
                            {folder.kind === "rule" ? "Edit rule" : "Edit binder"}
                        </Dropdown.Item>
                        <Dropdown.Item icon={Trash01} onAction={() => setConfirming(true)}>
                            Delete binder
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            {/* Opened by the menu items, not by buttons of their own: the overlays are controlled, and
                DialogTrigger, which wants a pressable child, is not in the picture. */}
            <FolderModal mode="edit" folder={folder} facets={facets} isOpen={editing} onOpenChange={setEditing} />
            <ModalOverlay isOpen={confirming} onOpenChange={setConfirming}>
                <Modal className="max-w-sm">
                    <Dialog>
                        {({ close }) => (
                            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Delete this binder?
                                </AriaHeading>
                                <p className="text-sm text-tertiary">
                                    {folder.kind === "rule"
                                        ? "Only this binder and its rule go. The cards stay where they are."
                                        : "The cards stay in your collection. Only this binder goes, and it cannot be brought back."}
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button color="secondary" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button color="primary-destructive" onClick={del} isLoading={deleting}>
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}
