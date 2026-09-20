"use client";

import { useState } from "react";
import { Check, Heart, Minus, Plus } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { addCard } from "@/app/(app)/dashboard/cards/actions";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { warmCard } from "@/components/app/card-memo";
import { CardPrice } from "@/components/app/card-price";
import { GotItButton } from "@/components/app/got-it-button";
import { PriceMove } from "@/components/app/price-change";
import { editionLabel, printingLabel } from "@/components/app/printing-choices";
import { TileIconButton } from "@/components/app/tile-icon-button";
import { useCopySteps } from "@/components/app/use-copy-steps";
import { useWarm } from "@/components/app/use-warm";
import { useWishStep } from "@/components/app/use-wish-step";
import type { SetCard } from "@/lib/api-shapes";
import { cardLine } from "@/lib/card-label";
import { pokemonCardFromSetCard } from "@/lib/card-shapes";
import { type CardsSize, TILE_SIZES, TILE_WIDTH } from "@/lib/cards-view";
import type { Holding } from "@/lib/set-holding";

/**
 * One card of a set, and what you can do with it from here. A card you do not hold has two round
 * buttons under it, the wishlist and the collection; one on the wishlist has the heart filled, in
 * pink, which takes it off again, and the plus that files it; one you hold has a minus where the
 * heart was and the plus. No menu on any of them. Copies are only offered
 * when the card is one row, which is nearly always: a card held as two printings is managed
 * in Cards, where each printing is its own row.
 *
 * Every button answers under the finger and writes after (`useCopySteps`, `useWishStep`), without
 * drawing the page again: `onChange` tells the page what changed, so its counts follow (`SetLive`).
 * A tile drawn again (a tab switched away and back) starts from the card as the page holds it now,
 * `card`, and takes the page's reading once `stamp`, the card as the server drew it, changes.
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
    setId = null,
    language = "en",
    size = "md",
    priority = false,
    onOpen,
    stamp = "",
    onChange,
}: {
    card: SetCard;
    /** The set this page is, so a press forgets this set's page and leaves every other set's standing. */
    setId?: string | null;
    /** The card's holding as the server drew it (`holdingKey`). */
    stamp?: string;
    onChange?: (patch: Partial<Holding>) => void;
    language?: string;
    /** The grid's tile size, so the picture is asked for at the width it is drawn. */
    size?: CardsSize;
    /** On screen at load: the first row, which holds the largest paint. */ priority?: boolean;
    /** Tapping the picture: the page opens the card, the tile only says which. */
    onOpen?: (card: SetCard) => void;
}) {
    // What the server drew is taken once it changes; until then the card as it was when this tile was drawn.
    const [drawn, setDrawn] = useState({ stamp, card });
    if (drawn.stamp !== stamp) setDrawn({ stamp, card });
    const base = drawn.stamp === stamp ? drawn.card : card;
    // What the sheet will ask for, asked while the pointer rests here, so the first open is complete.
    const warm = useWarm(onOpen ? () => warmCard(card.tcgId, language) : undefined);

    const oneRow = base.itemIds.length === 1;
    const {
        held,
        press,
        buttons,
        error: stepError,
    } = useCopySteps({
        name: card.name,
        set: setId,
        held: base.owned ? base.quantity : 0,
        rowId: base.owned ? base.itemIds[0] : undefined,
        add: () => addCard(pokemonCardFromSetCard(card, language), "collection", undefined, { reread: false }),
        // The cache forgotten, the page not drawn again: that was the wait.
        quiet: true,
        onShown: (_, to) => onChange?.({ owned: to > 0, quantity: to, ...(to === 0 ? { itemIds: [] } : {}) }),
        onStored: (_, id) => onChange?.({ itemIds: id ? [id] : [] }),
    });
    const wish = useWishStep({
        name: card.name,
        set: setId,
        wished: base.wishlist,
        rowId: base.wishlist && oneRow ? base.itemIds[0] : undefined,
        add: () => addCard(pokemonCardFromSetCard(card, language), "wishlist", undefined, { reread: false }),
        onShown: (wished) => onChange?.({ wishlist: wished, ...(wished ? {} : { itemIds: [] }) }),
        onStored: (id) => onChange?.({ itemIds: id ? [id] : [] }),
    });
    const error = stepError ?? wish.error;
    /* The heart is drawn anew when it fills or empties, so a keyboard on it lost its place and
       started again at the top of the page. Focus goes to the new heart, the first button, once it
       is drawn: the plus beside a fresh wish is still waiting for its row and cannot take it. */
    const pressWish = (next: boolean) => {
        const hadFocus = buttons.current?.contains(document.activeElement);
        wish.press(next);
        if (hadFocus) requestAnimationFrame(() => buttons.current?.querySelector("button")?.focus());
    };

    const state = held > 0 ? "owned" : wish.wished ? "wishlist" : "missing";
    // One wish row, or none yet (a wish pressed a moment ago): two rows are managed in Cards.
    const wishHere = state === "wishlist" && (oneRow || !base.wishlist);
    // A card sold in runs is chosen between by its run in the sheet (Base Set Charizard: Unlimited,
    // 1st Edition), so its tile names the run; any other card names its printing.
    const printed = editionLabel(card.edition) ?? printingLabel(card.printing);
    // A copy more or less from here: a card you do not hold, or one you hold as one row.
    const stepping = state === "missing" || (state === "owned" && (oneRow || !base.owned));
    const stateLabel = {
        owned: held > 1 ? `${held} copies` : "in your collection",
        wishlist: "on your wishlist",
        missing: "not in your collection",
    }[state];

    return (
        <div className="relative flex flex-col gap-1.5">
            {/* The picture opens the card, the way a picture does on every other list in this app.
                It used to be the menu's trigger, so a tap on a card answered with a list of things
                to do to it and never with the card itself. The menu is a button of its own now. */}
            <AriaButton
                aria-label={`${card.name} #${card.printedNumber ?? card.number}, ${stateLabel}`}
                onPress={() => onOpen?.(card)}
                {...warm}
                // The shared tile's own frame: a card is its own surface, so nothing of ours sits behind
                // it: a card with no picture shows its back, not a grey box. A press gives way a little,
                // as CardTile does on every other list; the ring is for the keyboard only. It came on
                // with every tap too, a 2 px ring flashing round the card each time a phone touched it.
                className="relative block aspect-card w-full pressable cursor-pointer overflow-hidden rounded-card outline-offset-2 outline-focus-ring focus-visible:outline-2"
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
                        width={TILE_WIDTH[size]}
                        sizes={TILE_SIZES[size]}
                        priority={priority}
                        className="object-cover"
                    />
                ) : (
                    /* Face down: a real card no catalogue has a scan of. The caption under the tile
                       still names it, as it names every card. */
                    <CardBack width={TILE_WIDTH[size]} sizes={TILE_SIZES[size]} priority={priority} />
                )}
                {/* Only a card you hold is marked on the picture. A wish is said by the pink heart under
                    it, and a second heart on the art said the same thing twice. */}
                {state === "owned" ? (
                    <span className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-primary-solid px-1 text-2xs font-semibold text-primary_on-brand shadow-xs">
                        <Check className="size-3" aria-hidden="true" />
                        {held > 1 ? <span className="tabular-nums">{held}</span> : null}
                    </span>
                ) : null}
            </AriaButton>

            {/* The same three lines as every other overview: the name, the set's code and number,
                the market price. A set page that reads like the collection's own lists. */}
            <div className="flex flex-col">
                <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                {/* The set's code and the number, "POR 121", the line every other list prints under a card
                    and what the card prints in its corner. It was the number alone, on the grounds that
                    the page's title names the set; Bart's call, 2026-09-13: one way of writing a card
                    everywhere, as printed on the card (cardLabel): the catalogue's number is the printed one.
                    The rarity follows after a bullet, "POR 121 · Rare" (Bart's call, 2026-09-15): on a set
                    page it is what tells two cards of the same Pokémon apart without opening either. */}
                <span className="truncate text-xs text-tertiary tabular-nums">
                    {cardLine({ set_name: card.setName, set_abbr: card.setAbbr, number: card.number, printed_number: card.printedNumber, rarity: card.rarity })}
                </span>
                {/* Which printing the price is, "Holo" or "Reverse", on a line of its own as a copy's
                    printing is on the collection's tiles: a Holo Rare's price read as anyone's guess
                    between its printings (Bart, 2026-09-18). The sheet opens on the same one. */}
                {printed ? <span className="truncate text-xs text-tertiary">{printed}</span> : null}
                {/* The price with its week under it on the left, the buttons on the right of the same line
                    (Bart's call, 2026-09-18). Where the two do not fit beside each other (a four-figure
                    price on a phone's 108 px tile) the buttons wrap under, against the right edge, as they
                    stood before: a price broken in two or buttons run past the tile read worse than a
                    second line. How many you hold follows the price. */}
                <div className="mt-0.5 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
                    <div className="flex flex-col">
                        <span className="flex items-baseline gap-1.5 text-sm font-medium tabular-nums">
                            <span className="text-primary">
                                <CardPrice price={card.price} listing={card.listingPrice} />
                            </span>
                            {/* Polite: a press says its new count, with no toast for a change you are looking at. */}
                            <span aria-live="polite" className="text-xs text-tertiary">
                                {held > 0 ? (
                                    <>
                                        <span className="sr-only">You hold </span>×{held}
                                    </>
                                ) : null}
                            </span>
                        </span>
                        <PriceMove change={card.priceChange} over="in the last 7 days" />
                    </div>
                    <div ref={buttons} className="ml-auto flex gap-1">
                        {wishHere ? (
                            <TileIconButton
                                icon={Heart}
                                on="wishlist"
                                label={`Remove ${card.name} #${card.printedNumber ?? card.number} from your wishlist`}
                                onPress={() => pressWish(false)}
                            />
                        ) : null}
                        {state === "missing" ? (
                            <>
                                <TileIconButton
                                    icon={Heart}
                                    label={`Add ${card.name} #${card.printedNumber ?? card.number} to your wishlist`}
                                    onPress={() => pressWish(true)}
                                />
                                <TileIconButton
                                    icon={Plus}
                                    label={`Add ${card.name} #${card.printedNumber ?? card.number} to your collection`}
                                    onPress={() => press(1)}
                                />
                            </>
                        ) : null}
                        {/* The wishlist's own plus, which asks what your copy is like before it joins the
                        collection. It used to move the card at once here and ask nothing, so the same mark
                        did two different things depending on the page you pressed it on. A wish pressed a
                        moment ago has no row yet to move, so its plus waits for one. */}
                        {wishHere && wish.id ? (
                            <GotItButton
                                card={{
                                    id: wish.id,
                                    name: card.name,
                                    image_url: card.imageUrl,
                                    set_name: card.setName,
                                    set_abbr: card.setAbbr,
                                    number: card.number,
                                    printed_number: card.printedNumber,
                                    grade: null,
                                    finish: null,
                                    foil_pattern: null,
                                    edition: null,
                                    tcg_id: card.tcgId,
                                    language,
                                }}
                            />
                        ) : wishHere ? (
                            <TileIconButton icon={Plus} label={`Add ${card.name} to your collection`} pending />
                        ) : null}
                        {/* A card you hold: the minus where the heart was (a card you own cannot be wished for),
                        then the same plus as a card you do not, since it is the same answer. The minus on
                        the last copy takes the card out, with the way back in the toast. */}
                        {state === "owned" && stepping ? (
                            <>
                                <TileIconButton
                                    icon={Minus}
                                    label={
                                        held > 1
                                            ? `Remove a copy of ${card.name} #${card.printedNumber ?? card.number}`
                                            : `Remove ${card.name} #${card.printedNumber ?? card.number} from your collection`
                                    }
                                    onPress={() => press(held - 1)}
                                />
                                <TileIconButton
                                    icon={Plus}
                                    label={`Add a copy of ${card.name} #${card.printedNumber ?? card.number}`}
                                    onPress={() => press(held + 1)}
                                />
                            </>
                        ) : null}
                    </div>
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
