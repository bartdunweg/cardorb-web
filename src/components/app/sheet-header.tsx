"use client";

import type { RefObject } from "react";
import { ChevronLeft, ChevronRight, DotsHorizontal, Phone01, Star01, Trash01, XClose } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { artStack } from "@/components/app/card-art";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { CardPrice } from "@/components/app/card-price";
import { HoloCard } from "@/components/app/holo-card";
import type { PrintingChoice } from "@/components/app/printing-choices";
import { SheetBar } from "@/components/app/sheet-bar";
import { MARK_ON } from "@/components/app/tile-icon-button";
import type { useCardArt } from "@/components/app/use-card-art";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button, styles as buttonStyles } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cardLabel, cardLabelFull } from "@/lib/card-label";
import type { Card, PublicCard } from "@/lib/cards";
import { LISTING_NOTE, formatPrice } from "@/lib/format";
import type { PriceChange } from "@/lib/price-change";
import { cx } from "@/utils/cx";

type Props = {
    card: Card | PublicCard | null;
    mine: Card | null;
    rowPending: boolean;
    titleRef: RefObject<HTMLHeadingElement | null>;
    /** The slideout's own close, from its render prop. */
    close: () => void;
    closeSheet: () => Promise<void>;
    busy: boolean;
    isStarred: boolean;
    toggleStar: () => void;
    removeAndOffer: (row: Card) => void;
    cardArt: ReturnType<typeof useCardArt>;
    onPrev?: (() => void) | null;
    onNext?: (() => void) | null;
    step: (dir: -1 | 1) => void;
    printing: PrintingChoice | null;
    known: CardFacts | null;
    shownPrice: number | null | undefined;
    /** The pressed printing's lowest listing, where it has no market figure (useSheetPrinting). */
    shownListing?: number | null;
    publicPrice: number | null;
    shownChange: PriceChange | null;
};

/** The card sheet's top: the sticky bar with its menu, then the card's art, name and price. */
export function SheetHeader({
    card,
    mine,
    rowPending,
    titleRef,
    close,
    closeSheet,
    busy,
    isStarred,
    toggleStar,
    removeAndOffer,
    cardArt,
    onPrev,
    onNext,
    step,
    printing,
    known,
    shownPrice,
    shownListing = null,
    publicPrice,
    shownChange,
}: Props) {
    /* The lowest listing, only where no market figure is shown: the copy's own on the printing the
       sheet opened on, and another printing's when it is pressed (the line beside the history,
       cardorb-api#561). A printing with neither still says it has no price. */
    const listingCard = mine ?? card;
    const listing =
        shownPrice === null
            ? shownListing
            : shownPrice === undefined && (mine?.price ?? publicPrice) == null && listingCard && "listing_price" in listingCard
              ? (listingCard.listing_price ?? null)
              : null;
    const { art, backdrop, scanLoaded, blurLoaded, scanFade, prevScan, blurFade, onScanLoad, onBlurLoad, canTilt, tiltGranted, askTilt } = cardArt;
    // In the dots menu, where the card's other actions are; a bar button of its own spent one of
    // the four places up there on a thing an iPhone asks once and never again. Where there is no
    // menu (somebody else's card, a read-only sheet) it stays a button, because otherwise it has
    // nowhere to live and the tilt is exactly what you want on a card you are being shown.
    const tiltButton =
        canTilt && !mine ? (
            <Button
                color="tertiary"
                size="lg"
                iconLeading={Phone01}
                aria-label="Tilt with your phone"
                className="glass text-primary ring-1 ring-glass ring-inset"
                onClick={() => void askTilt()}
            />
        ) : null;

    return (
        <>
            {/* Close, the name once the title has passed, the star and the menu: sticky on the sheet's
                scroll, over the art at first. Glass buttons, so they sit in the picture rather than on it. */}
            <SheetBar
                title={card?.name ?? ""}
                titleRef={titleRef}
                left={
                    <>
                        <Button
                            color="tertiary"
                            size="lg"
                            iconLeading={XClose}
                            aria-label="Close"
                            className="glass text-primary ring-1 ring-glass ring-inset"
                            onClick={() => void closeSheet()}
                        />
                    </>
                }
                right={
                    <>
                        {tiltButton}
                        {mine && !rowPending ? (
                            <>
                                {mine.owned ? (
                                    <Tooltip title={isStarred ? "Remove from Favorites" : "Add to Favorites"}>
                                        {/* Set, the star is filled on yellow, the favourites' own colour, as a set
                                            wish is a filled heart on pink under a tile (MARK_ON). It was the primary
                                            button, white in dark mode, which read as the sheet's main action rather
                                            than as "this one is a favourite". */}
                                        <Button
                                            color="tertiary"
                                            size="lg"
                                            iconLeading={
                                                isStarred ? <Star01 data-icon="leading" className={cx(buttonStyles.common.icon, "fill-current")} /> : Star01
                                            }
                                            aria-label="Favorite"
                                            aria-pressed={isStarred}
                                            onClick={toggleStar}
                                            className={isStarred ? MARK_ON.favorite : "glass text-primary ring-1 ring-glass ring-inset"}
                                        />
                                    </Tooltip>
                                ) : null}
                                {/* What else is done to a card: copies, and taking it out. A wish can be marked owned here too.
                                    A card nobody holds arrives with an empty row rather than none, so `mine` is
                                    there and "Remove from collection" was offered for a card that is in no
                                    collection, to a visitor too. Only a card held or wished can be taken out, and
                                    a menu with nothing in it is no menu: the button goes with its last item. */}
                                {canTilt || mine.owned || mine.wishlist ? (
                                    <Dropdown.Root>
                                        <Button
                                            color="tertiary"
                                            size="lg"
                                            iconLeading={DotsHorizontal}
                                            aria-label="More"
                                            isLoading={busy}
                                            className="glass text-primary ring-1 ring-glass ring-inset"
                                        />
                                        <Dropdown.Popover placement="bottom end" className="w-56">
                                            <Dropdown.Menu>
                                                {/* Once the card can follow the phone, the browser has been asked and
                                                the question does not come back. */}
                                                {canTilt ? (
                                                    <Dropdown.Item icon={Phone01} onAction={() => void askTilt()}>
                                                        Tilt with your phone
                                                    </Dropdown.Item>
                                                ) : null}
                                                {/* Copies are counted under Your copies, with the rest of what a copy is.
                                                Adding and removing one here as well was a second place for the same
                                                number, and the one that showed no other copy while it did it.

                                                "Hide from public page" is gone because it hid nothing: `forPublic()`
                                                strips the flag rather than filtering on it, and the only reader left
                                                was the latest-pull block, which the profile no longer shows. What
                                                does keep cards off a public profile is a binder's own switch. */}
                                                {mine.owned || mine.wishlist ? (
                                                    <Dropdown.Item icon={Trash01} onAction={() => removeAndOffer(mine)}>
                                                        {mine.wishlist ? "Remove from wishlist" : "Remove from collection"}
                                                    </Dropdown.Item>
                                                ) : null}
                                            </Dropdown.Menu>
                                        </Dropdown.Popover>
                                    </Dropdown.Root>
                                ) : null}
                            </>
                        ) : null}
                    </>
                }
            />
            <SlideoutMenu.Header onClose={close} close="none" className="px-0 pt-0 md:px-0">
                {/* The card first, on a blurred, dimmed copy of itself: the art sets the header's colour,
                    the way a product page takes its hero's. The copy is decoration and says nothing. */}
                {/* Clipped, not hidden: an overflow-hidden box can still be scrolled, and focusing a
                    printing button scrolled the blurred, oversized backdrop 30 px up and aside. */}
                <div className="relative w-full overflow-clip">
                    {card?.image_url ? (
                        /* The dimming sits on the box, not the layers, so the new copy at full
                           opacity covers the old one entirely rather than mixing with it. */
                        <div aria-hidden="true" className="absolute inset-0 opacity-60">
                            {artStack(backdrop).map(({ layer, shown }) => (
                                <div
                                    key={layer.scan}
                                    ref={shown ? blurFade : undefined}
                                    className={cx("absolute inset-0 scale-125 blur-lg", shown && !blurLoaded && "opacity-0")}
                                >
                                    <CardImage
                                        src={layer.blur}
                                        alt=""
                                        width={64}
                                        className="object-cover"
                                        // Eager: the header's colour at the moment the sheet opens, and lazy
                                        // it waited for a scroll that never comes inside the sheet.
                                        priority
                                        onLoad={shown ? onBlurLoad : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 fade-to-page" />
                    {/* The card begins under the row of buttons, with a breath between. The buttons
                        end at 66px (top-3 plus a 44px button); pt-16 left eight pixels under them,
                        which read as the card being pinned to the bar rather than sitting below it. */}
                    <div className="relative px-10 pt-24 pb-6">
                        {/* Through the list without going back to it. Beside the card rather than
                            in the bar: the card is 176px in a panel more than twice that, so the
                            room either side of it was already there, and here an arrow points at
                            the thing it changes instead of sitting among the sheet's own buttons.
                            Centred on the card, not on the box, since the box also holds the
                            padding the card tilts in. */}
                        {onPrev || onNext ? (
                            <div className="pointer-events-none absolute inset-x-3 top-24 bottom-6 z-10 flex items-center justify-between">
                                {/* Not drawn rather than drawn dead. At the first or last card of a list a
                                    greyed arrow is a button asking to be pressed and then refusing, and it
                                    sits over the card while it does it. The empty span holds the other
                                    arrow's side, so a lone Next stays on the right where it belongs. */}
                                {onPrev ? (
                                    <Tooltip title="Previous card (←)">
                                        <Button
                                            color="tertiary"
                                            size="lg"
                                            iconLeading={ChevronLeft}
                                            aria-label="Previous card"
                                            className="pointer-events-auto glass text-primary ring-1 ring-glass ring-inset"
                                            onClick={() => step(-1)}
                                        />
                                    </Tooltip>
                                ) : (
                                    <span />
                                )}
                                {onNext ? (
                                    <Tooltip title="Next card (→)">
                                        <Button
                                            color="tertiary"
                                            size="lg"
                                            iconLeading={ChevronRight}
                                            aria-label="Next card"
                                            className="pointer-events-auto glass text-primary ring-1 ring-glass ring-inset"
                                            onClick={() => step(1)}
                                        />
                                    </Tooltip>
                                ) : (
                                    <span />
                                )}
                            </div>
                        ) : null}
                        {card?.image_url ? (
                            /* The card tilts and shines under the pointer (the copy's finish and the
                               printing's rarity pick the foil); the header's padding is the room it tilts in. */
                            <div className="relative mx-auto w-full max-w-44">
                                <HoloCard
                                    rarity={card.rarity}
                                    finish={printing?.finish ?? mine?.finish ?? card.finish ?? null}
                                    // A public profile is not told what somebody's copy looks
                                    // like, so there is nothing to narrow to there.
                                    foilPattern={printing ? printing.foilPattern : (mine?.foil_pattern ?? ("foil_pattern" in card ? card.foil_pattern : null))}
                                    facts={known}
                                    number={card.number}
                                    types={card.types}
                                    gen={card.gen}
                                    ownPhoto={Boolean(printing?.image)}
                                    tilt={tiltGranted}
                                    className="w-full"
                                >
                                    {/* The card's face is a grid with one cell, and every child of it is laid
                                        in that cell (the vendored effect's rule): the two scans stack there
                                        by themselves, the one underneath first. The card frame, its shadow and
                                        its shine stay put; the pictures cross inside it. */}
                                    {/* Underneath everything, the card as the head already has it: the 64 px copy
                                        that colours the header, drawn again inside the frame, scaled up and blurred.
                                        The same address, so the browser fetches it once and it lands with the
                                        header's colour, a few hundred milliseconds before the scan; the scan then
                                        sharpens over it. Until even that small copy is here the frame is a flat
                                        fill: the sheet used to open on the frame's shadow around nothing, a ghost
                                        of a card while the scan was on its way. Stepping through a list the last
                                        scan is opaque on top of this, so it only shows through the crossfade. */}
                                    {art.shown ? (
                                        <div aria-hidden="true" className="bg-secondary">
                                            <CardImage
                                                src={art.shown.blur}
                                                alt=""
                                                width={64}
                                                className={cx(
                                                    "scale-105 object-cover blur-sm transition-opacity duration-(--duration-base)",
                                                    !blurLoaded && "opacity-0",
                                                )}
                                                priority
                                            />
                                        </div>
                                    ) : null}
                                    {artStack(art).map(({ layer, shown }) => (
                                        <div
                                            key={layer.scan}
                                            ref={shown ? scanFade : prevScan}
                                            aria-hidden={shown ? undefined : "true"}
                                            className={shown && !scanLoaded ? "opacity-0" : undefined}
                                        >
                                            <CardImage
                                                src={layer.scan}
                                                fallbackSrc={layer.blur}
                                                alt={shown ? card.name : ""}
                                                // The box is max-w-44, so 176 CSS pixels: 384 asked for the 828 rung and
                                                // got a 50 KB file where 24 KB shows every pixel, eagerly, on every tap,
                                                // because this one is priority. `width` is what the layout draws, not the
                                                // scan you want.
                                                width={176}
                                                quality={75}
                                                className="object-cover"
                                                priority
                                                onLoad={shown ? onScanLoad : undefined}
                                            />
                                        </div>
                                    ))}
                                </HoloCard>
                            </div>
                        ) : (
                            /* Face down, at the size the scan would be. The sheet's heading names the card. */
                            <div className="relative mx-auto aspect-card w-full max-w-44 overflow-hidden rounded-card">
                                <CardBack width={176} priority />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col px-4 pt-4 md:px-6">
                    {/* Prev and next swap the whole sheet for another card while focus stays on
                        the button that did it, and a dialog that is already open does not
                        announce its name changing. So the sheet says which card it is now.
                        Always mounted, or the first change would be silent too. */}
                    <output aria-live="polite" className="sr-only">
                        {card
                            ? [
                                  card.name,
                                  card.set_name,
                                  // The label the line under the title prints, without the set's name said just before it.
                                  cardLabel({ ...card, set_name: null }) || null,
                              ]
                                  .filter(Boolean)
                                  .join(", ")
                            : ""}
                    </output>
                    <AriaHeading ref={titleRef} slot="title" className="text-lg font-semibold text-primary">
                        {/* No star here. The bar above carries it as a button you can press;
                            a second one under the title said the same thing and did nothing. */}
                        {/* The printed name in brackets after the English one, for a card off the
                            Japanese shelf: the app is English throughout, and
                            this is the one place what the card says is worth a look. */}
                        {card ? ("local_name" in card && card.local_name ? `${card.name} (${card.local_name})` : card.name) : null}
                    </AriaHeading>
                    <p className="text-sm text-tertiary">{(card && cardLabelFull(card)) || "—"}</p>
                    {/* The price sits under the title, where a product panel puts it, not among the attributes. */}
                    {shownPrice === null && listing == null ? (
                        <p className="text-sm text-tertiary">No price for this printing</p>
                    ) : shownPrice !== null && (shownPrice ?? mine?.price ?? publicPrice) != null ? (
                        <p className="flex items-baseline gap-2 text-md font-semibold text-primary tabular-nums">
                            <span>
                                {formatPrice((shownPrice ?? mine?.price ?? publicPrice)!)}
                                <span className="sr-only"> market price</span>
                            </span>
                            {/* Beside it, which way it moved over the period the chart below is drawing,
                                the way an asset page puts the change next to the price so a glance says up
                                or down. The period is in the reading, not in the text: the buttons that set
                                it are on screen under this, and a "· 6M" after every figure is a word to
                                read every time to learn nothing new. The sign is in the text, so colour is
                                never the only carrier; a screen reader gets it spelled out ("Up €0.12, 5
                                percent, in the last 6 months") from a span of its own, because a bare span
                                takes no aria-label. `arrive` because the line comes a beat after the sheet. */}
                            {shownChange ? (
                                <span
                                    className={cx(
                                        "arrive text-sm font-medium whitespace-nowrap",
                                        shownChange.direction === "up" ? "text-success-primary" : "text-error-primary",
                                    )}
                                >
                                    <span aria-hidden="true">{shownChange.text}</span>
                                    <span className="sr-only">{shownChange.label}</span>
                                </span>
                            ) : null}
                        </p>
                    ) : listing != null ? (
                        /* No market figure at all, and TCGplayer lists the card: its lowest asking price,
                           said as one, the way every tile says it (cardorb-api#561). Never summed. */
                        <p className="flex flex-col">
                            <span className="text-md font-semibold text-primary tabular-nums">
                                <CardPrice price={null} listing={listing} />
                            </span>
                            <span aria-hidden="true" className="text-sm text-tertiary">
                                {LISTING_NOTE}
                            </span>
                        </p>
                    ) : null}
                </div>
            </SlideoutMenu.Header>
        </>
    );
}
