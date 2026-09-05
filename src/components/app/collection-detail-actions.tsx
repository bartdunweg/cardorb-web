"use client";

import { useState } from "react";
import { Check, Edit03, Plus, SearchLg, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { deleteCollection, setCardCollection } from "@/app/(app)/dashboard/collections/actions";
import { CardImage } from "@/components/app/card-image";
import { FolderDialog } from "@/components/app/folder-dialog";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { Facets } from "@/lib/cards";
import type { FolderKind, FolderRule, PokedexSetting } from "@/lib/folder-rule";
import { cx } from "@/utils/cx";

// The button's visible text; also its accessible name, with the card's name after it.
const addLabel = (st: string | undefined) => (st === "done" ? "Added" : st === "adding" ? "Adding…" : "Add");

export function CollectionDetailActions({
    folder,
    facets,
}: {
    folder: { id: string; name: string; kind: FolderKind; rule: FolderRule | null; pokedex: PokedexSetting | null };
    facets: Facets;
}) {
    const router = useRouter();
    const collectionId = folder.id;

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<Record<string, "adding" | "done">>({});
    const { results, loading } = useDebouncedSearch<CardHit>(query, searchMyCards, { minLength: 1, delay: 250 });
    const searchState = loading ? "Searching…" : query.trim().length >= 1 && results.length === 0 ? "No cards found." : "";

    const add = async (card: CardHit) => {
        setStatus((s) => ({ ...s, [card.id]: "adding" }));
        const res = await setCardCollection(card.id, collectionId);
        if (res.ok) {
            setStatus((s) => ({ ...s, [card.id]: "done" }));
            router.refresh();
        } else {
            setStatus((s) => {
                const next = { ...s };
                delete next[card.id];
                return next;
            });
        }
    };

    const [deleting, setDeleting] = useState(false);
    const del = async () => {
        setDeleting(true);
        const res = await deleteCollection(collectionId);
        if (res.ok) router.push("/dashboard/collections");
        else setDeleting(false);
    };

    return (
        <div className="flex gap-2">
            {/* A rule folder decides its own contents: its action is the rule, not a search box. */}
            <FolderDialog mode="edit" folder={folder} facets={facets}>
                <Button color="secondary" iconLeading={Edit03}>
                    {folder.kind === "rule" ? "Edit rule" : "Edit folder"}
                </Button>
            </FolderDialog>
            {folder.kind === "rule" ? null : (
                <DialogTrigger>
                    <Button iconLeading={Plus}>Add cards</Button>
                    <ModalOverlay>
                        <Modal className="max-w-xl">
                            <Dialog>
                                <div className="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl ring-1 ring-secondary">
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        Add cards to this folder
                                    </AriaHeading>
                                    <Input
                                        aria-label="Search your cards"
                                        icon={SearchLg}
                                        placeholder="Search your cards…"
                                        value={query}
                                        onChange={setQuery}
                                        wrapperClassName="rounded-full"
                                    />
                                    <div className="flex min-h-40 flex-col gap-1 overflow-y-auto">
                                        {/* One live region, always mounted, so a screen reader hears the state change. */}
                                        <output aria-live="polite" className={cx("text-center text-sm text-tertiary", searchState ? "px-1 py-6" : "sr-only")}>
                                            {searchState}
                                        </output>
                                        {!loading &&
                                            results.map((card) => {
                                                const st = status[card.id];
                                                return (
                                                    <div key={card.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                                                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-quaternary ring-1 ring-image ring-inset">
                                                            {card.image_url ? (
                                                                <CardImage src={card.image_url} alt="" sizes="40px" className="object-cover" />
                                                            ) : null}
                                                        </div>
                                                        <div className="flex min-w-0 flex-1 flex-col">
                                                            <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                                                            <span className="truncate text-xs text-tertiary">
                                                                {[card.set_name, card.number ? `#${card.number}` : null].filter(Boolean).join(" · ")}
                                                            </span>
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
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            )}

            <DialogTrigger>
                <Button color="secondary-destructive" iconLeading={Trash01}>
                    Delete
                </Button>
                <ModalOverlay>
                    <Modal className="max-w-sm">
                        <Dialog>
                            {({ close }) => (
                                <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl ring-1 ring-secondary">
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        Delete this folder?
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">
                                        {folder.kind === "rule"
                                            ? "Only this folder and its rule go. The cards stay where they are."
                                            : "The cards stay in your collection. Only this folder goes, and it cannot be brought back."}
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
