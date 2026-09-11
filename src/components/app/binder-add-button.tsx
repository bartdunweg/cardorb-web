"use client";

import { useRef, useState } from "react";
import { Plus, Rows01, SearchLg } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button as AriaButton, Heading as AriaHeading } from "react-aria-components";
import { type CardHit, editCopies, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { useCommandSearch } from "@/components/app/command-search";
import { notify } from "@/components/app/toast";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { styles } from "@/components/base/buttons/button-styles";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { cardLabel } from "@/lib/card-label";
import { cx } from "@/utils/cx";

/**
 * The plus on a hand-filled binder's page. Pressing it is the choice — Bart's call, 2026-09-11:
 * when you reach for the plus you already know whether you are after a card you do not have yet
 * or one you hold. So it opens a menu of the two rather than one search that guesses:
 *
 * - Search all cards: the one palette, as everywhere. Opened from this page, a hit's sheet puts
 *   "Add to <binder>" first, and a card you do not own lands in the collection and in the binder
 *   in one press (the sheet reads the binder from the path).
 * - From your collection: a search of the cards you hold, with a checkbox per hit, so several go
 *   in at once.
 *
 * A rule binder fills itself and has no plus of this kind; its page shows the plain Add card.
 */
export function BinderAddButton({ folder, compact }: { folder: { id: string; name: string }; compact: boolean }) {
    const { open } = useCommandSearch();
    const [picking, setPicking] = useState(false);
    return (
        <>
            <Dropdown.Root>
                {/* The kit's own trigger element, as the dots beside it: the menu opens from it by mouse
                    and by keyboard alike, which a kit Button standing in for it did not. It wears the
                    primary button's classes, so it reads as the Add card every other list has. */}
                <AriaButton
                    aria-label="Add card"
                    data-icon-only={compact ? true : undefined}
                    className={cx(styles.common.root, styles.sizes[compact ? "lg" : "md"].root, styles.colors.primary.root, "rounded-full before:rounded-full")}
                >
                    <Plus data-icon="leading" className={styles.common.icon} />
                    {compact ? null : <span data-text>Add card</span>}
                </AriaButton>
                <Dropdown.Popover className="w-64">
                    <Dropdown.Menu>
                        <Dropdown.Item icon={SearchLg} onAction={open}>
                            Search all cards
                        </Dropdown.Item>
                        <Dropdown.Item icon={Rows01} onAction={() => setPicking(true)}>
                            From your collection
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            {/* Opened by the menu item, not by a button of its own: the overlay is controlled, and
                DialogTrigger — which wants a pressable child — is not in the picture. */}
            <ModalOverlay isOpen={picking} onOpenChange={setPicking}>
                <Modal className="max-w-xl">
                    <Dialog>{({ close }) => <OwnCardsPicker folder={folder} close={close} />}</Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}

// The words for a count: "1 card", "3 cards".
const cards = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;

/**
 * Your own cards into this binder, several at a time: search, tick, one press. The form mounts
 * inside the dialog, so it starts clean on every open. What you ticked survives the next search,
 * so a binder can be filled from more than one query before the press.
 */
function OwnCardsPicker({ folder, close }: { folder: { id: string; name: string }; close: () => void }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
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

    const [picked, setPicked] = useState<Map<string, CardHit>>(new Map());
    const [saving, setSaving] = useState(false);
    const toggle = (card: CardHit, on: boolean) =>
        setPicked((prev) => {
            const next = new Map(prev);
            if (on) next.set(card.id, card);
            else next.delete(card.id);
            return next;
        });

    const save = async () => {
        if (!picked.size) return;
        setSaving(true);
        // One call for all of them: the API takes the ids beside the field (see editCopies).
        const res = await editCopies([...picked.keys()], { collectionId: folder.id });
        setSaving(false);
        if (!res.ok) {
            notify.failed(`Those cards were not added to ${folder.name}`, { description: res.error });
            return;
        }
        close();
        router.refresh();
        notify.done(`${cards(picked.size)} added to ${folder.name}`);
    };

    return (
        <div className="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                    Add from your collection
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
                <output aria-live="polite" className={cx("text-center text-sm text-tertiary", searchState ? "px-1 py-6" : "sr-only")}>
                    {searchState}
                </output>
                {failed && !loading ? (
                    <Button size="sm" color="secondary" className="self-center" onClick={retryAndRefocus}>
                        Try again
                    </Button>
                ) : null}
                {!loading &&
                    results.map((card) => {
                        const here = card.collection_id === folder.id;
                        return (
                            <Checkbox
                                key={card.id}
                                size="md"
                                className="rounded-lg p-2 hover:bg-secondary"
                                isSelected={here || picked.has(card.id)}
                                isDisabled={here || saving}
                                onChange={(on) => toggle(card, on)}
                                // The whole row is the label, so the box's name is the card's.
                                label={
                                    <span className="flex items-center gap-3">
                                        <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded ring-1 ring-image ring-inset">
                                            {card.image_url ? (
                                                <CardImage src={card.image_url} alt="" width={64} className="object-cover" />
                                            ) : (
                                                <CardBack width={64} />
                                            )}
                                        </span>
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                                            <span className="truncate text-xs font-normal text-tertiary">{cardLabel(card, "lg")}</span>
                                        </span>
                                    </span>
                                }
                                hint={here ? "Already in this binder" : card.collection_id ? "In another binder; it moves" : undefined}
                            />
                        );
                    })}
            </div>
            <div className="flex items-center justify-end gap-2">
                <Button color="secondary" onClick={close}>
                    Cancel
                </Button>
                <Button color="primary" iconLeading={Plus} isDisabled={!picked.size} isLoading={saving} onClick={save}>
                    {picked.size ? `Add ${cards(picked.size)}` : "Add"}
                </Button>
            </div>
        </div>
    );
}
