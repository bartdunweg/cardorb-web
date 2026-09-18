"use client";

import { useState } from "react";
import { DotsHorizontal, Edit03, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button as AriaButton, Heading as AriaHeading } from "react-aria-components";
import { deleteBinder } from "@/app/(app)/dashboard/collections/actions";
import { BinderModal } from "@/components/app/binder-dialog";
import { notify } from "@/components/app/toast";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { styles } from "@/components/base/buttons/button-styles";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useArrived } from "@/hooks/use-arrived";
import type { BinderKind, BinderRule, PokedexSetting } from "@/lib/binder-rule";
import type { Facets } from "@/lib/cards";
import { orFailed } from "@/lib/write-outcome";
import { cx } from "@/utils/cx";

/**
 * The dots on a binder's page: what is done to the binder itself, one press further than the
 * plus that fills it. Edit is here too, not a button of its own beside the plus; Bart's call,
 * 2026-09-11. Deleting is the one thing that cannot be undone, and the confirm dialog stands.
 */
export function BinderMenu({
    binder,
    facets: facetsOnTheWay,
    compact,
}: {
    binder: { id: string; name: string; kind: BinderKind; rule: BinderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };
    /**
     * The page's read, which may still be on its way: until it is in, the edit form asks for them
     * itself. A promise rather than a Suspense boundary around the menu, so the menu is never
     * swapped for a second one while it is open (use-arrived.ts).
     */
    facets?: Facets | PromiseLike<Facets | undefined>;
    /** In the phone's bar, the size of Back beside it. */
    compact: boolean;
}) {
    const router = useRouter();
    const facets = useArrived<Facets | undefined>(facetsOnTheWay, undefined);
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const del = async () => {
        setDeleting(true);
        // A throw (no signal, a deploy in between) reads like a refusal, or the button would spin
        // for good. On success the list you land on is the answer; on failure the button is ready
        // again and the toast says the binder is still there.
        const res = await orFailed(deleteBinder(binder.id));
        if (res.ok) router.push("/dashboard/collections");
        else {
            setDeleting(false);
            notify.failed(`${binder.name} was not deleted`, { description: res.error });
        }
    };

    return (
        <>
            <Dropdown.Root>
                {/* A react-aria button, as the kit's DotsButton is: the menu opens from it by mouse and
                    by keyboard alike, which a kit Button standing in for it did not. Its own rather than
                    the kit's, whose dots stand upright where every other "more" in the app lies across
                    (the list settings, the card sheet; Bart, 2026-09-19). It wears the secondary pill's
                    own classes, so it sits beside the other bar buttons as the same button. */}
                <AriaButton
                    aria-label="Open menu"
                    className={cx(
                        styles.common.root,
                        styles.sizes[compact ? "lg" : "md"].root,
                        styles.colors.secondary.root,
                        "cursor-pointer rounded-full outline-focus-ring before:rounded-full focus-visible:outline-2 focus-visible:outline-offset-2",
                        compact ? "p-3" : "p-2.5",
                    )}
                >
                    <DotsHorizontal aria-hidden="true" className="size-5 shrink-0" />
                </AriaButton>
                <Dropdown.Popover className="w-56">
                    <Dropdown.Menu>
                        <Dropdown.Item icon={Edit03} onAction={() => setEditing(true)}>
                            {binder.kind === "rule" ? "Edit rule" : "Edit binder"}
                        </Dropdown.Item>
                        <Dropdown.Item icon={Trash01} onAction={() => setConfirming(true)}>
                            Delete binder
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            {/* Opened by the menu items, not by buttons of their own: the overlays are controlled, and
                DialogTrigger, which wants a pressable child, is not in the picture. */}
            <BinderModal mode="edit" binder={binder} facets={facets} isOpen={editing} onOpenChange={setEditing} />
            <ModalOverlay isOpen={confirming} onOpenChange={setConfirming}>
                <Modal className="max-w-sm">
                    <Dialog>
                        {({ close }) => (
                            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Delete this binder?
                                </AriaHeading>
                                <p className="text-sm text-tertiary">
                                    {binder.kind === "rule"
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
