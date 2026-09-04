"use client";

import { useState, useTransition } from "react";
import { Check, Heart, Minus, Plus, Rows01, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { addCard, markOwned, removeCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { type SetCard, pokemonCardFromSetCard } from "@/lib/api-shapes";
import { cx } from "@/utils/cx";

const SIZES = "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 17vw, 140px";

type Result = { ok: true } | { ok: false; error: string };

/**
 * One card of a set, and what you can do with it from here. The tile is a menu button: a card
 * you do not hold offers the collection or the wishlist; one on the wishlist offers "Got it";
 * one you hold offers a copy more or less, and the way to it in Cards. Copies are only offered
 * when the card is one row, which is nearly always: a card held as two printings is managed
 * in Cards, where each printing is its own row.
 *
 * The picture carries no text of its own — the caption under it and the button's name say
 * which card this is and whether it is yours, so the grey is never the only signal.
 */
export function SetCardTile({ card }: { card: SetCard }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const run = (action: () => Promise<Result>) => {
        setError(null);
        startTransition(async () => {
            const res = await action();
            if (res.ok) router.refresh();
            else setError(res.error);
        });
    };

    const oneRow = card.itemIds.length === 1;
    const rowId = card.itemIds[0];
    const state = card.owned ? "owned" : card.wishlist ? "wishlist" : "missing";
    const stateLabel = {
        owned: card.quantity > 1 ? `${card.quantity} copies` : "in your collection",
        wishlist: "on your wishlist",
        missing: "not in your collection",
    }[state];

    return (
        <div className="flex flex-col gap-1.5">
            <Dropdown.Root>
                <AriaButton
                    isDisabled={pending}
                    aria-label={`${card.name} #${card.number}, ${stateLabel}`}
                    className={({ isPressed, isFocusVisible }) =>
                        cx(
                            "relative block aspect-[63/88] w-full cursor-pointer overflow-hidden rounded-md ring-1 ring-secondary outline-focus-ring ring-inset",
                            !card.owned && "bg-secondary",
                            (isPressed || isFocusVisible) && "outline-2 outline-offset-2",
                            pending && "cursor-progress",
                        )
                    }
                >
                    {card.imageUrl ? (
                        <CardImage src={card.imageUrl} alt="" sizes={SIZES} className={cx("object-cover", !card.owned && "opacity-30 grayscale")} />
                    ) : (
                        <div className="flex size-full items-center justify-center bg-quaternary p-1 text-center text-xxs text-quaternary">{card.name}</div>
                    )}
                    {state === "wishlist" ? (
                        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-fg-quaternary ring-1 ring-secondary">
                            <Heart className="size-3" aria-hidden="true" />
                        </span>
                    ) : null}
                </AriaButton>

                <Dropdown.Popover className="w-56">
                    <Dropdown.Menu>
                        {state === "missing" ? (
                            <>
                                <Dropdown.Item icon={Plus} onAction={() => run(() => addCard(pokemonCardFromSetCard(card), "collection"))}>
                                    Add to collection
                                </Dropdown.Item>
                                <Dropdown.Item icon={Heart} onAction={() => run(() => addCard(pokemonCardFromSetCard(card), "wishlist"))}>
                                    Add to wishlist
                                </Dropdown.Item>
                            </>
                        ) : null}
                        {state === "wishlist" ? (
                            <>
                                {oneRow ? (
                                    <Dropdown.Item icon={Check} onAction={() => run(() => markOwned(rowId))}>
                                        Got it
                                    </Dropdown.Item>
                                ) : null}
                                {oneRow ? (
                                    <Dropdown.Item icon={Trash01} onAction={() => run(() => removeCard(rowId))}>
                                        Remove from wishlist
                                    </Dropdown.Item>
                                ) : null}
                                <Dropdown.Item icon={Heart} href={`/dashboard/wishlist?q=${encodeURIComponent(card.name)}`}>
                                    Open in Wishlist
                                </Dropdown.Item>
                            </>
                        ) : null}
                        {state === "owned" ? (
                            <>
                                {oneRow ? (
                                    <Dropdown.Item icon={Plus} onAction={() => run(() => setCopies(rowId, card.quantity + 1))}>
                                        Add a copy
                                    </Dropdown.Item>
                                ) : null}
                                {oneRow && card.quantity > 1 ? (
                                    <Dropdown.Item icon={Minus} onAction={() => run(() => setCopies(rowId, card.quantity - 1))}>
                                        Remove a copy
                                    </Dropdown.Item>
                                ) : null}
                                {oneRow && card.quantity <= 1 ? (
                                    <Dropdown.Item icon={Trash01} onAction={() => run(() => removeCard(rowId))}>
                                        Remove from collection
                                    </Dropdown.Item>
                                ) : null}
                                <Dropdown.Item icon={Rows01} href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`}>
                                    Open in Cards
                                </Dropdown.Item>
                            </>
                        ) : null}
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>

            <span className="flex items-baseline gap-1 text-xs">
                <span className="shrink-0 text-tertiary tabular-nums">#{card.number}</span>
                <span className={cx("truncate", card.owned ? "text-primary" : "text-quaternary")}>{card.name}</span>
                {card.quantity > 1 ? <span className="ml-auto shrink-0 text-tertiary tabular-nums">×{card.quantity}</span> : null}
            </span>
            {/* Announced when it appears; the tile keeps its place so the grid does not jump. */}
            {error ? (
                <p role="alert" className="text-xs text-error-primary">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
