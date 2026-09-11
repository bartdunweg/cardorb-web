"use client";

import { useRef, useState } from "react";
import { Check, DotsHorizontal, Edit03, Plus, SearchLg, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { deleteCollection, setCardCollection } from "@/app/(app)/dashboard/collections/actions";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { FolderDialog } from "@/components/app/folder-dialog";
import { notify } from "@/components/app/toast";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { cardLabel } from "@/lib/card-label";
import type { Facets } from "@/lib/cards";
import type { FolderKind, FolderRule, PokedexSetting } from "@/lib/folder-rule";
import { cx } from "@/utils/cx";

// The button's visible text; also its accessible name, with the card's name after it.
const addLabel = (st: string | undefined) => (st === "done" ? "Added" : st === "adding" ? "Adding…" : "Add");

export function CollectionDetailActions({
    folder,
    facets,
}: {
    folder: { id: string; name: string; kind: FolderKind; rule: FolderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };
    facets: Facets;
}) {
    const router = useRouter();
    const collectionId = folder.id;

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<Record<string, "adding" | "done">>({});
    const { results, loading, failed, retry } = useDebouncedSearch<CardHit>(query, searchMyCards, { minLength: 1, delay: 250 });
    const inputRef = useRef<HTMLInputElement>(null);
    // Try again unmounts the button that was pressed the moment hits land, and focus would fall
    // to the page; it goes back to the field instead, where the next keystroke belongs.
    const retryAndRefocus = () => {
        retry();
        inputRef.current?.focus();
    };
    const searchState = loading
        ? "Searching…"
        : failed
          ? "The card service didn't answer."
          : query.trim().length >= 1 && results.length === 0
            ? "No cards found."
            : "";

    const add = async (card: CardHit) => {
        setStatus((s) => ({ ...s, [card.id]: "adding" }));
        const res = await setCardCollection(card.id, collectionId);
        if (res.ok) {
            setStatus((s) => ({ ...s, [card.id]: "done" }));
            router.refresh();
        } else {
            // The button falls back to "Add" on its own, which reads as a missed click; the toast
            // is the only thing that says the card is not in this Binder.
            setStatus((s) => {
                const next = { ...s };
                delete next[card.id];
                return next;
            });
            notify.failed(`${card.name} was not added to ${folder.name}`, { description: res.error });
        }
    };

    const [deleting, setDeleting] = useState(false);
    // The dots menu opens the confirm dialog; the dialog's own trigger button is gone with it.
    const [confirming, setConfirming] = useState(false);
    const del = async () => {
        setDeleting(true);
        const res = await deleteCollection(collectionId);
        // On success the list you land on is the answer. On failure the dialog just sits there
        // with its button ready again, saying nothing.
        if (res.ok) router.push("/dashboard/collections");
        else {
            setDeleting(false);
            notify.failed(`${folder.name} was not deleted`, { description: res.error });
        }
    };

    return (
        <div className="flex gap-2">
            {/* A rule folder decides its own contents: its action is the rule, not a search box. */}
            <FolderDialog mode="edit" folder={folder} facets={facets}>
                <Button color="secondary" size="md" iconLeading={Edit03}>
                    {folder.kind === "rule" ? "Edit rule" : "Edit binder"}
                </Button>
            </FolderDialog>
            {folder.kind === "rule" ? null : (
                <DialogTrigger>
                    <Button size="md" iconLeading={Plus}>
                        Add cards
                    </Button>
                    <ModalOverlay>
                        <Modal className="max-w-xl">
                            <Dialog>
                                {({ close }) => (
                                    <div className="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
                                        <div className="flex items-start justify-between gap-3">
                                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                                Add cards to this binder
                                            </AriaHeading>
                                            <CloseButton onClick={close} size="sm" className="-mt-1 -mr-1" />
                                        </div>
                                        <Input
                                            ref={inputRef}
                                            aria-label="Search your cards"
                                            icon={SearchLg}
                                            placeholder="Search your cards…"
                                            value={query}
                                            onChange={setQuery}
                                            wrapperClassName="rounded-full"
                                        />
                                        <div className="flex min-h-40 flex-col gap-1 overflow-y-auto">
                                            {/* One live region, always mounted, so a screen reader hears the state change. */}
                                            <output
                                                aria-live="polite"
                                                className={cx("text-center text-sm text-tertiary", searchState ? "px-1 py-6" : "sr-only")}
                                            >
                                                {searchState}
                                            </output>
                                            {failed && !loading ? (
                                                <Button size="sm" color="secondary" className="self-center" onClick={retryAndRefocus}>
                                                    Try again
                                                </Button>
                                            ) : null}
                                            {!loading &&
                                                results.map((card) => {
                                                    const st = status[card.id];
                                                    return (
                                                        <div key={card.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                                                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded ring-1 ring-image ring-inset">
                                                                {card.image_url ? (
                                                                    <CardImage src={card.image_url} alt="" width={64} className="object-cover" />
                                                                ) : (
                                                                    <CardBack width={64} />
                                                                )}
                                                            </div>
                                                            <div className="flex min-w-0 flex-1 flex-col">
                                                                <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                                                                <span className="truncate text-xs text-tertiary">{cardLabel(card, "lg")}</span>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                color={st === "done" ? "secondary" : "primary"}
                                                                isDisabled={!!st}
                                                                iconLeading={st === "done" ? Check : Plus}
                                                                onClick={() => add(card)}
                                                                // A list of buttons all named "Add" is a list of nothing to a screen reader.
                                                                aria-label={`${addLabel(st)} ${card.name}`}
                                                            >
                                                                {addLabel(st)}
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            )}

            {/* Deleting is the one thing here that cannot be undone, so it is not a button beside the
                two that can: it sits behind the dots, the way the tiles keep theirs, one press further
                than Edit and Add. The confirm dialog is the same as before. */}
            <Dropdown.Root>
                <Button color="secondary" size="md" iconLeading={DotsHorizontal} aria-label="More" />
                <Dropdown.Popover className="w-56">
                    <Dropdown.Menu>
                        <Dropdown.Item icon={Trash01} onAction={() => setConfirming(true)}>
                            Delete binder
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            <DialogTrigger isOpen={confirming} onOpenChange={setConfirming}>
                <ModalOverlay>
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
            </DialogTrigger>
        </div>
    );
}
