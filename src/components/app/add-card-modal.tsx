"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Check, Plus, SearchLg } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type PokemonCard, addCard, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";

type Target = "collection" | "wishlist";

export function AddCardModal({ defaultTarget = "collection", trigger }: { defaultTarget?: Target; trigger?: ReactNode } = {}) {
    const router = useRouter();
    const [target, setTarget] = useState<Target>(defaultTarget);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Record<string, "adding" | "done">>({});
    const reqId = useRef(0);

    useEffect(() => {
        const term = query.trim();
        const id = ++reqId.current;
        // All state changes live inside the debounce timer, so none run synchronously in the effect.
        const t = setTimeout(async () => {
            if (term.length < 2) {
                setResults([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const found = await searchPokemon(term);
            if (id === reqId.current) {
                setResults(found);
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    // Status is keyed by target + card so the same card can be added to both places.
    const keyFor = (card: PokemonCard) => `${target}:${card.id}`;

    const onAdd = async (card: PokemonCard) => {
        const key = keyFor(card);
        setStatus((s) => ({ ...s, [key]: "adding" }));
        const res = await addCard(card, target);
        if (res.ok) {
            setStatus((s) => ({ ...s, [key]: "done" }));
            router.refresh();
        } else {
            setStatus((s) => {
                const next = { ...s };
                delete next[key];
                return next;
            });
        }
    };

    return (
        <DialogTrigger>
            {trigger ?? <ButtonUtility icon={Plus} aria-label="Add card" color="secondary" className="rounded-full" />}

            <ModalOverlay>
                <Modal className="max-w-xl">
                    <Dialog>
                        {({ close }) => (
                            <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex flex-col gap-0.5">
                                        <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                            Add a card
                                        </AriaHeading>
                                        <p className="text-sm text-tertiary">Search the Pokémon card database.</p>
                                    </div>
                                    <CloseButton onClick={close} size="sm" className="-mt-1 -mr-1" />
                                </div>

                                <ButtonGroup
                                    selectionMode="single"
                                    disallowEmptySelection
                                    selectedKeys={new Set([target])}
                                    onSelectionChange={(keys) => {
                                        const key = [...keys][0];
                                        if (key === "collection" || key === "wishlist") setTarget(key);
                                    }}
                                >
                                    <ButtonGroupItem id="collection">Collection</ButtonGroupItem>
                                    <ButtonGroupItem id="wishlist">Wishlist</ButtonGroupItem>
                                </ButtonGroup>

                                <Input aria-label="Search cards" icon={SearchLg} placeholder="Search by name…" value={query} onChange={setQuery} />

                                <div className="flex min-h-40 flex-col gap-1 overflow-y-auto">
                                    {loading && <p className="px-1 py-6 text-center text-sm text-tertiary">Searching…</p>}
                                    {!loading && query.trim().length >= 2 && results.length === 0 && (
                                        <p className="px-1 py-6 text-center text-sm text-tertiary">No cards found.</p>
                                    )}
                                    {!loading &&
                                        results.map((card) => {
                                            const st = status[keyFor(card)];
                                            return (
                                                <div key={card.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                                                    {card.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={card.image} alt="" className="h-16 w-auto shrink-0 rounded" loading="lazy" />
                                                    ) : (
                                                        <div className="h-16 w-11 shrink-0 rounded bg-quaternary" />
                                                    )}
                                                    <div className="flex min-w-0 flex-1 flex-col">
                                                        <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                                                        <span className="truncate text-xs text-tertiary">
                                                            {[card.set, card.number ? `#${card.number}` : null, card.rarity].filter(Boolean).join(" · ")}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        color={st === "done" ? "secondary" : "primary"}
                                                        isDisabled={!!st}
                                                        iconLeading={st === "done" ? Check : Plus}
                                                        onClick={() => onAdd(card)}
                                                    >
                                                        {st === "done" ? "Added" : st === "adding" ? "Adding…" : "Add"}
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
    );
}
