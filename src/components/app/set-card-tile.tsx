"use client";

import { useState, useTransition } from "react";
import { Check, DotsHorizontal, Heart, Minus, Plus, Rows01, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { addCard, markOwned, removeCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { type SetCard, pokemonCardFromSetCard } from "@/lib/api-shapes";
import { TILE_WIDTH } from "@/lib/cards-view";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

type Result = { ok: true } | { ok: false; error: string };

/**
 * One card of a set, and what you can do with it from here. The tile is a menu button: a card
 * you do not hold offers the collection or the wishlist; one on the wishlist offers "Mark as owned";
 * one you hold offers a copy more or less, and the way to it in Cards. Copies are only offered
 * when the card is one row, which is nearly always: a card held as two printings is managed
 * in Cards, where each printing is its own row.
 *
 * The picture carries no text of its own — the caption under it and the button's name say
 * which card this is and whether it is yours, so the grey is never the only signal.
 */
/** `readOnly`: another language's catalogue, which the collection cannot take yet; the tile shows and does nothing. */
export function SetCardTile({
    card,
    readOnly = false,
    priority = false,
    onOpen,
}: {
    card: SetCard;
    readOnly?: boolean;
    /** On screen at load: the first row, which holds the largest paint. */ priority?: boolean;
    /** Tapping the picture: the page opens the card, the tile only says which. */
    onOpen?: (card: SetCard) => void;
}) {
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
        <div className="relative flex flex-col gap-1.5">
            {/* The picture opens the card, the way a picture does on every other list in this app.
                It used to be the menu's trigger, so a tap on a card answered with a list of things
                to do to it and never with the card itself. The menu is a button of its own now. */}
            <AriaButton
                isDisabled={pending}
                aria-label={`${card.name} #${card.number}, ${stateLabel}`}
                onPress={() => onOpen?.(card)}
                className={({ isPressed, isFocusVisible }) =>
                    cx(
                        // The shared tile's own frame: a card is its own surface, so nothing of ours
                        // sits behind it and the grey box is only for a card with no picture.
                        "relative block aspect-card w-full cursor-pointer overflow-hidden rounded-card outline-offset-2 outline-focus-ring",
                        !card.imageUrl && "bg-quaternary",
                        (isPressed || isFocusVisible) && "outline-2",
                        pending && "cursor-progress",
                    )
                }
            >
                {card.imageUrl ? (
                    /* In full colour, whether or not it is yours. A set read as a checklist while
                           every other list in the app reads as a shelf, and dimming a card to 30% grey
                           is the one presentation that hides the thing you came to look at — what you
                           are missing. What you hold is said by the mark in the corner instead. */
                    <CardImage
                        src={card.imageHighUrl ?? card.imageUrl}
                        fallbackSrc={card.imageUrl}
                        alt=""
                        width={TILE_WIDTH.md}
                        priority={priority}
                        className="object-cover"
                    />
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1 p-3 text-center">
                        <span className="line-clamp-4 text-sm font-medium text-secondary">{card.name}</span>
                        <span className="text-2xs text-quaternary">#{card.number}</span>
                    </div>
                )}
                {state !== "missing" ? (
                    <span
                        className={cx(
                            "absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full px-1 text-2xs font-semibold shadow-xs",
                            // The wishlist heart is a meaningful graphic — on a grid of 129 tiles it is
                            // the one mark that says "you already want this" — so it owes 3:1 against the
                            // tile it sits on. fg-quaternary is 2.58:1 on white; fg-tertiary clears it in
                            // both themes.
                            state === "owned" ? "bg-primary-solid text-primary_on-brand" : "bg-primary text-fg-tertiary ring-1 ring-secondary",
                        )}
                    >
                        {state === "owned" ? <Check className="size-3" aria-hidden="true" /> : <Heart className="size-3" aria-hidden="true" />}
                        {state === "owned" && card.quantity > 1 ? <span className="tabular-nums">{card.quantity}</span> : null}
                    </span>
                ) : null}
            </AriaButton>

            {/* The same three lines as every other overview: the name, the set's code and number,
                the market price. A set page that reads like the collection's own lists. */}
            <div className="flex flex-col">
                <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                {/* The number alone, not the set's code: every card here is from the same set, so
                    repeating it on all 120 tiles says nothing the page's own title has not. */}
                <span className="truncate text-xs text-tertiary tabular-nums">#{card.number}</span>
                {/* The price and the two controls on one line under the card. They sat in the
                    picture's corner, over the art you came to look at, and on a grid of 129 that is
                    129 things floating on top of the cards. Under it they are still one press away
                    and the card is whole. */}
                <div className="mt-0.5 flex items-center gap-2">
                    {/* The same two numbers a tile carries on every other list: how many you hold on
                        the left, what one is worth on the right. A set page was the one place that
                        said only the price, so a card you held four of looked like a card you held. */}
                    <span className="text-sm font-medium text-tertiary tabular-nums">
                        {card.owned && card.quantity > 0 ? (
                            <>
                                <span className="sr-only">You hold </span>×{card.quantity}
                            </>
                        ) : null}
                    </span>
                    <span className="ml-auto text-sm font-medium text-primary tabular-nums">
                        {card.price != null ? (
                            <>
                                <span className="sr-only">Near Mint price </span>
                                {formatPrice(card.price)}
                            </>
                        ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                        {/* The menu, where the picture used to be its trigger. A dots button in the corner beside
                    the plus, so everything the tile could do is still one press away — it is just no
                    longer the answer to tapping the card. */}
                        <Dropdown.Root>
                            <AriaButton
                                isDisabled={pending || readOnly}
                                aria-label={`What to do with ${card.name} #${card.number}`}
                                className={({ isFocusVisible, isHovered }) =>
                                    cx(
                                        "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary ring-1 ring-primary outline-offset-2 outline-focus-ring ring-inset",
                                        isHovered && "bg-primary_hover",
                                        isFocusVisible && "outline-2",
                                        pending && "cursor-progress opacity-50",
                                        readOnly && "hidden",
                                    )
                                }
                            >
                                <DotsHorizontal className="size-3.5" aria-hidden="true" />
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
                                                    Mark as owned
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
                                                Open in Collection
                                            </Dropdown.Item>
                                        </>
                                    ) : null}
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                        {/* One tap to own it, for the card you do not have. The menu behind the tile still offers
                    the wishlist and everything else; this is the one answer common enough to deserve a
                    button, and it sits outside the tile's own button because a button inside a button is
                    not a thing a browser will render. */}
                        {state === "missing" && !readOnly ? (
                            <AriaButton
                                isDisabled={pending}
                                aria-label={`Add ${card.name} #${card.number} to your collection`}
                                onPress={() => run(() => addCard(pokemonCardFromSetCard(card), "collection"))}
                                className={({ isFocusVisible, isHovered }) =>
                                    cx(
                                        // size-7, not size-6: 24px clears WCAG 2.5.8's minimum by nothing at all, and this
                                        // is a thumb target on a phone, in a grid of 129 of them.
                                        "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary ring-1 ring-primary outline-offset-2 outline-focus-ring ring-inset",
                                        isHovered && "bg-primary_hover",
                                        isFocusVisible && "outline-2",
                                        pending && "cursor-progress opacity-50",
                                    )
                                }
                            >
                                <Plus className="size-3.5" aria-hidden="true" />
                            </AriaButton>
                        ) : null}
                    </span>
                </div>
            </div>
            {/* Announced when it appears; the tile keeps its place so the grid does not jump. */}
            {error ? (
                <p role="alert" className="text-xs text-error-primary">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
