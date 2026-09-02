"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, SearchLg, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { deleteCollection, setCardCollection } from "@/app/(app)/dashboard/collections/actions";
import { CardImage } from "@/components/app/card-image";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export function CollectionDetailActions({ collectionId }: { collectionId: string }) {
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CardHit[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Record<string, "adding" | "done">>({});
    const reqId = useRef(0);

    useEffect(() => {
        const term = query.trim();
        const id = ++reqId.current;
        // All state changes live inside the debounce timer, so none run synchronously in the effect.
        const t = setTimeout(async () => {
            if (term.length < 1) {
                setResults([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const found = await searchMyCards(term);
            if (id === reqId.current) {
                setResults(found);
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

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
            <DialogTrigger>
                <Button iconLeading={Plus}>Add cards</Button>
                <ModalOverlay>
                    <Modal className="max-w-xl">
                        <Dialog>
                            <div className="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Add cards to this collection
                                </AriaHeading>
                                <Input aria-label="Search your cards" icon={SearchLg} placeholder="Search your cards…" value={query} onChange={setQuery} />
                                <div className="flex min-h-40 flex-col gap-1 overflow-y-auto">
                                    {loading && <p className="px-1 py-6 text-center text-sm text-tertiary">Searching…</p>}
                                    {!loading && query.trim().length >= 1 && results.length === 0 && (
                                        <p className="px-1 py-6 text-center text-sm text-tertiary">No cards found.</p>
                                    )}
                                    {!loading &&
                                        results.map((card) => {
                                            const st = status[card.id];
                                            return (
                                                <div key={card.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                                                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-quaternary">
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
                                                    >
                                                        {st === "done" ? "Added" : st === "adding" ? "Adding…" : "Add"}
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

            <Button color="secondary-destructive" iconLeading={Trash01} onClick={del} isLoading={deleting}>
                Delete
            </Button>
        </div>
    );
}
