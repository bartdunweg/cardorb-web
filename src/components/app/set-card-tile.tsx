"use client";

import { useState, useTransition } from "react";
import { Check, DotsHorizontal, Heart, Minus, Plus, Rows01, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { addCard, removeCard, setCopies } from "@/app/(app)/dashboard/cards/actions";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { warmCard } from "@/components/app/card-memo";
import { GotItButton } from "@/components/app/got-it-button";
import { TileIconButton } from "@/components/app/tile-icon-button";
import { notify } from "@/components/app/toast";
import { useWarm } from "@/components/app/use-warm";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { type SetCard, pokemonCardFromSetCard } from "@/lib/api-shapes";
import { TILE_SIZES, TILE_WIDTH } from "@/lib/cards-view";
import { formatPrice } from "@/lib/format";
import { cx } from "@/utils/cx";

type Result = { ok: true } | { ok: false; error: string };

/**
 * One card of a set, and what you can do with it from here. A card you do not hold has two round
 * buttons under it, the wishlist and the collection; one on the wishlist has the wishlist's check
 * and a menu (remove it, the way to it); one you hold has a plus for a copy more and the menu (a
 * copy less, the way to it). Copies are only offered
 * when the card is one row, which is nearly always: a card held as two printings is managed
 * in Cards, where each printing is its own row.
 *
 * The picture carries no text of its own: the caption under it and the button's name say
 * which card this is and whether it is yours, so the grey is never the only signal.
 *
 * `language` is the shelf this tile is on, carried into the add so the API can find the card in
 * its own catalogue. It replaces `readOnly`: another language's cards could be looked at and not
 * taken, because the collection resolved a card by its English set name and a Japanese set has
 * none. Now the catalogue's own id says which card it is (cardorb-api#257).
 */
export function SetCardTile({
    card,
    language = "en",
    priority = false,
    onOpen,
}: {
    card: SetCard;
    language?: string;
    /** On screen at load: the first row, which holds the largest paint. */ priority?: boolean;
    /** Tapping the picture: the page opens the card, the tile only says which. */
    onOpen?: (card: SetCard) => void;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    // What the sheet will ask for, asked while the pointer rests here, so the first open is complete.
    const warm = useWarm(onOpen ? () => warmCard(card.tcgId) : undefined);

    const run = <R extends Result>(action: () => Promise<R>, then?: (res: Extract<R, { ok: true }>) => void) => {
        setError(null);
        startTransition(async () => {
            const res = await action();
            if (res.ok) {
                router.refresh();
                then?.(res as Extract<R, { ok: true }>);
            } else setError(res.error);
        });
    };

    /* One press adds a card, with nothing to confirm, on a grid where a thumb lands one tile off.
       So every add says what it did and offers the way back for as long as the toast is up. The
       way back is the opposite write: the row the add made is removed, the copy taken off again.
       An add the API answered without the new row's id says what it did and offers nothing. */
    const offerUndo = (done: string, undo: (() => Promise<Result>) | null) => {
        if (!undo) return notify.done(done);
        notify.done(done, {
            undo: {
                onUndo: () =>
                    void undo().then((res) => {
                        if (res.ok) notify.done("Undone");
                        else notify.failed("That did not go back", { description: res.error });
                        router.refresh();
                    }),
            },
        });
    };
    const add = (target: "collection" | "wishlist") =>
        run(
            () => addCard(pokemonCardFromSetCard(card, language), target),
            (res) =>
                offerUndo(
                    target === "wishlist" ? `${card.name} is on your wishlist now` : `${card.name} is in your collection now`,
                    res.id ? () => removeCard(res.id as string) : null,
                ),
        );

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
                {...warm}
                className={({ isPressed, isFocusVisible }) =>
                    cx(
                        // The shared tile's own frame: a card is its own surface, so nothing of ours
                        // sits behind it: a card with no picture shows its back, not a grey box.
                        "relative block aspect-card w-full cursor-pointer overflow-hidden rounded-card outline-offset-2 outline-focus-ring",
                        (isPressed || isFocusVisible) && "outline-2",
                        pending && "cursor-progress",
                    )
                }
            >
                {card.imageUrl ? (
                    /* In full colour, whether or not it is yours. A set read as a checklist while
                           every other list in the app reads as a shelf, and dimming a card to 30% grey
                           is the one presentation that hides the thing you came to look at, what you
                           are missing. What you hold is said by the mark in the corner instead. */
                    <CardImage
                        src={card.imageHighUrl ?? card.imageUrl}
                        fallbackSrc={card.imageUrl}
                        alt=""
                        width={TILE_WIDTH.md}
                        sizes={TILE_SIZES.md}
                        priority={priority}
                        className="object-cover"
                    />
                ) : (
                    /* Face down: a real card no catalogue has a scan of. The caption under the tile
                       still names it, as it names every card. */
                    <CardBack width={TILE_WIDTH.md} sizes={TILE_SIZES.md} priority={priority} />
                )}
                {state !== "missing" ? (
                    <span
                        className={cx(
                            "absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full px-1 text-2xs font-semibold shadow-xs",
                            // The wishlist heart is a meaningful graphic (on a grid of 129 tiles it is
                            // the one mark that says "you already want this"), so it owes 3:1 against the
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
                {/* The count and the price on one line, the two controls on their own line under it.
                    The controls sat in the picture's corner, over the art you came to look at, and on
                    a grid of 129 that is 129 things floating on top of the cards. Then they shared the
                    price's line, which on a phone is 110 px across three tiles: the price broke in two
                    and the buttons ran 6 px past the tile, behind the card beside it. A line of their
                    own costs 32 px a tile and fits at every width. */}
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
                                <span className="sr-only">Market price </span>
                                {formatPrice(card.price)}
                            </>
                        ) : null}
                    </span>
                </div>
                {/* The buttons on a line of their own under the count and the price, every one the same
                    round size, the one you reach for most against the right edge. A card you do not hold
                    has two answers, the collection or the wishlist, so both are buttons and there is no
                    menu: the heart sat behind a dots button, one press further than the plus for no reason.
                    A card you want gets the check the wishlist's own tiles carry, in the same place; the
                    menu stays for the rest (removing it, a copy more or less, the way to it). */}
                <div className="mt-1 flex justify-end gap-1">
                    {state !== "missing" ? (
                        <Dropdown.Root>
                            <TileIconButton icon={DotsHorizontal} label={`What to do with ${card.name} #${card.number}`} pending={pending} />
                            <Dropdown.Popover className="w-56">
                                <Dropdown.Menu>
                                    {state === "wishlist" ? (
                                        <>
                                            {oneRow ? (
                                                <Dropdown.Item icon={Trash01} onAction={() => run(() => removeCard(rowId))}>
                                                    Remove from wishlist
                                                </Dropdown.Item>
                                            ) : null}
                                            <Dropdown.Item icon={Heart} href={`/dashboard/wishlist?q=${encodeURIComponent(card.name)}`}>
                                                Open in Wishlist
                                            </Dropdown.Item>
                                        </>
                                    ) : (
                                        <>
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
                                    )}
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    ) : null}
                    {state === "missing" ? (
                        <>
                            <TileIconButton
                                icon={Heart}
                                label={`Add ${card.name} #${card.number} to your wishlist`}
                                pending={pending}
                                onPress={() => add("wishlist")}
                            />
                            <TileIconButton
                                icon={Plus}
                                label={`Add ${card.name} #${card.number} to your collection`}
                                pending={pending}
                                onPress={() => add("collection")}
                            />
                        </>
                    ) : null}
                    {/* The wishlist's own check, which asks what your copy is like before it joins the
                        collection. It used to move the card at once here and ask nothing, so the same mark
                        did two different things depending on the page you pressed it on. */}
                    {state === "wishlist" && oneRow ? (
                        <GotItButton
                            card={{
                                id: rowId,
                                name: card.name,
                                image_url: card.imageUrl,
                                set_name: card.setName,
                                set_abbr: null,
                                number: card.number,
                                grade: null,
                                finish: null,
                                foil_pattern: null,
                                edition: null,
                                tcg_id: card.tcgId,
                            }}
                        />
                    ) : null}
                    {/* One more of a card you hold: the same plus as a card you do not, since it is the same
                        answer, another one in the collection. Taking one off stays in the menu, where a
                        press that loses a card is one step further away. */}
                    {state === "owned" && oneRow ? (
                        <TileIconButton
                            icon={Plus}
                            label={`Add a copy of ${card.name} #${card.number}`}
                            pending={pending}
                            onPress={() =>
                                run(
                                    () => setCopies(rowId, card.quantity + 1),
                                    () => offerUndo(`${card.name}: ${card.quantity + 1} copies now`, () => setCopies(rowId, card.quantity)),
                                )
                            }
                        />
                    ) : null}
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
