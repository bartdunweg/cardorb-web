"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Plus, SearchLg } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type PokemonCard, addCard, searchPokemon } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { cx } from "@/utils/cx";

type Target = "collection" | "wishlist";

// The button's visible text; also its accessible name, with the card's name after it.
const addLabel = (st: string | undefined) => (st === "done" ? "Added" : st === "adding" ? "Adding…" : "Add");

// `compact` makes the default trigger a plus alone, for beside a page title on a phone; `label` gives
// the default trigger other words. An icon is a function, so a server page cannot hand one to this
// client component, not even inside a `trigger` element: an empty state's button once carried
// `iconLeading={Plus}` across the boundary and every render of that page logged the serialisation
// error. A page asks for the shape or the words instead, and this file draws the plus.
export function AddCardModal({
    defaultTarget = "collection",
    trigger,
    compact = false,
    label = "Add card",
}: { defaultTarget?: Target; trigger?: ReactNode; compact?: boolean; label?: string } = {}) {
    const router = useRouter();
    const [target, setTarget] = useState<Target>(defaultTarget);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<Record<string, "adding" | "done">>({});
    const { results, loading } = useDebouncedSearch<PokemonCard>(query, searchPokemon, { minLength: 2, delay: 300 });
    const searchState = loading ? "Searching…" : query.trim().length >= 2 && results.length === 0 ? "No cards found." : "";

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
            {/* The app's main action says what it does; a grey circle with a plus did not. */}
            {trigger ??
                (compact ? (
                    // The plus alone, the size of Back: it sits in the phone's bar beside it.
                    <Button iconLeading={Plus} size="sm" aria-label="Add card" />
                ) : (
                    <Button iconLeading={Plus} size="md">
                        {label}
                    </Button>
                ))}

            <ModalOverlay>
                <Modal className="max-w-xl">
                    <Dialog>
                        {({ close }) => (
                            <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
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

                                <Input
                                    aria-label="Search cards"
                                    icon={SearchLg}
                                    placeholder="Search by name…"
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
                                            const st = status[keyFor(card)];
                                            return (
                                                <div key={card.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                                                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-quaternary ring-1 ring-image ring-inset">
                                                        {card.image ? <CardImage src={card.image} alt="" width={64} className="object-cover" /> : null}
                                                    </div>
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
    );
}
