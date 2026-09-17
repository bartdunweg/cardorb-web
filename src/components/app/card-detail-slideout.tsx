"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, DotsHorizontal, Heart, Phone01, Plus, Star01, Trash01, XClose } from "@untitledui/icons";
import Image from "next/image";
import { Heading as AriaHeading } from "react-aria-components";
import { artStack } from "@/components/app/card-art";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { CardPriceChart } from "@/components/app/card-price-chart";
import type { PeriodKey } from "@/components/app/chart-periods";
import { CopyCard } from "@/components/app/copy-card";
import { CopyFormDialog } from "@/components/app/copy-form-dialog";
import { HoloCard } from "@/components/app/holo-card";
import { MarkOwnedDialog } from "@/components/app/mark-owned-dialog";
import { SheetActionBar } from "@/components/app/sheet-action-bar";
import { SheetBar } from "@/components/app/sheet-bar";
import { MARK_ON } from "@/components/app/tile-icon-button";
import { TypeIcon } from "@/components/app/type-icon";
import { useCardArt } from "@/components/app/use-card-art";
import { useSheetBinders } from "@/components/app/use-sheet-binders";
import { useSheetCopies } from "@/components/app/use-sheet-copies";
import { useSheetFacts } from "@/components/app/use-sheet-facts";
import { useSheetPrinting } from "@/components/app/use-sheet-printing";
import { useSheetStar } from "@/components/app/use-sheet-star";
import { useSheetSteps } from "@/components/app/use-sheet-steps";
import { useSheetWrites } from "@/components/app/use-sheet-writes";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button, styles as buttonStyles } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { PokemonCard } from "@/lib/api-shapes";
import { matchesRule } from "@/lib/binder-rule";
import { cardLabel, cardLabelFull, copyLine } from "@/lib/card-label";
import { isReverseFinish } from "@/lib/card-shapes";
import type { Card, PublicCard } from "@/lib/cards";
import { groupCopies } from "@/lib/copies";
import { formatPrice } from "@/lib/format";
import { tcgplayerUrl } from "@/lib/price-links";
import { listBinders } from "@/lib/reads";
import { cx } from "@/utils/cx";

/* What a write that never answered (the network dropped, the action threw) lands as: the same
   { ok: false } every write already handles, so the panel puts its numbers back and says so
   instead of staying busy or showing a change that did not happen. */

// `late`: a row the catalogue sends a hop after the sheet has settled arrives like the rest of what streams in.
function DetailRow({ label, value, late = false }: { label: string; value: ReactNode; late?: boolean }) {
    return (
        <div className={cx("flex items-start justify-between gap-4 py-3", late && "arrive")}>
            <dt className="text-sm text-tertiary">{label}</dt>
            <dd className="text-right text-sm font-medium text-primary">{value ?? "—"}</dd>
        </div>
    );
}

/**
 * `onPrev` / `onNext`: the cards either side of this one in the list it was opened from, where
 * there is one. A sheet opened from a search hit or a Pokédex slot has no next, and then the
 * buttons are not drawn rather than drawn dead.
 */
type Neighbours = { onPrev?: (() => void) | null; onNext?: (() => void) | null };

/**
 * `addable`: the catalogue card behind this sheet, for one that is neither held nor wished.
 *
 * The sheet is built around a row somebody owns, so a card with no row had nothing to offer and
 * opened as something to read. A set page is full of those.
 */
type Addable = {
    addable?: PokemonCard | null;
    /**
     * The card was taken, into the collection or onto the wishlist, and the store has its row: `id`.
     * A list that is given this marks the card itself and the page is not drawn again (the search's
     * hits, a set page); every other list learns it from the refresh the sheet asks for.
     */
    onTaken?: (card: PokemonCard, list: "collection" | "wishlist", id: string | undefined) => void;
    /**
     * The card is being taken, told on the press, before the write answers; what it returns puts the
     * list back if the write fails. A set page marks the tile here: a tile still showing its plus
     * through the write took a second press as a second row.
     */
    onTaking?: (card: PokemonCard, list: "collection" | "wishlist") => (() => void) | void;
    /**
     * The row shown was removed from the menu, told on the press. A list that is given this takes the
     * card off itself and the page is not drawn again; a removal that fails draws it again.
     */
    onRemoved?: (row: Card) => void;
    /**
     * The card is held or wished for and its row is still on the way (a set page tapped before its
     * rows were in): the copies' place is held, and nothing is offered that the row would take back.
     */
    rowPending?: boolean;
};

/**
 * `period`: the window the sheet opens its price line on, for a list that has one of its own.
 *
 * Home's Biggest movers is such a list: a card tapped in "in the last 6 months" opens on six
 * months, so the figure beside its price is the move that put it in that list rather than another
 * card's worth of arithmetic (Bart, 2026-09-16). A month elsewhere, as Home's chart starts.
 */
type Period = { period?: PeriodKey };

type Props = ({ card: Card | null; onClose: () => void; readOnly?: false } | { card: PublicCard | null; onClose: () => void; readOnly: true }) &
    Neighbours &
    Addable &
    Period;

export function CardDetailSlideout({
    card,
    onClose,
    readOnly = false,
    onPrev,
    onNext,
    addable,
    onTaken,
    onTaking,
    onRemoved,
    rowPending = false,
    period: opensOn = "1m",
}: Props) {
    const { mine, copies, setViewing, showRows, pressedRef, reloadCopies } = useSheetCopies({ card, readOnly });
    const { binders, setBinders, facets, binder, binderPending } = useSheetBinders({ card, readOnly });
    const { stepFromRef, step } = useSheetSteps({ onPrev, onNext });
    const { tcgId, genLogo, formFacts, known, points, period, setPeriod, said, change } = useSheetFacts({ card, mine, addable, opensOn });
    const { printings, editions, printingKey, editionKey, printing, edition, pressedImage, pick, shownSeries, shownPrice, shownChange, publicPrice } =
        useSheetPrinting({ card, mine, readOnly, tcgId, known, points, period, said, change, stepFromRef });
    const { takeable, emptied, busy, scheduleRefresh, add, fileInBinder, dropCopies, stepUp, stepDown, closeSheet, removeAndOffer } = useSheetWrites({
        card,
        readOnly,
        mine,
        copies,
        showRows,
        setViewing,
        pressedRef,
        reloadCopies,
        binder,
        printing,
        edition,
        addable,
        onClose,
        onTaken,
        onTaking,
        onRemoved,
    });
    const { isStarred, toggleStar } = useSheetStar({ card, mine, scheduleRefresh });
    const { art, backdrop, scanLoaded, blurLoaded, scanFade, prevScan, blurFade, onScanLoad, onBlurLoad, canTilt, tiltGranted, askTilt } = useCardArt({
        card,
        pressedImage,
        stepFromRef,
    });
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

    const titleRef = useRef<HTMLHeadingElement>(null);
    /* The binders any copy of this card is in: filed by hand, or fitting a rule binder's rule. */
    const heldRows = mine ? (copies ?? [mine]) : [];
    const inBinders = binders.filter((c) => heldRows.some((r) => (c.rule ? matchesRule(r, c.rule, facets) : r.collection_id === c.id)));

    /* What to do with a card you do not hold, built once: from `sm` up it sits under Your
       copies, under "You do not hold this card yet", and on a phone in a bar pinned to the bottom of
       the sheet, so it is reached without scrolling past every detail. One element, so the
       labels and the handlers cannot drift between the two places, and one place at a time, so
       a screen reader never hears "Add to collection" twice. The breakpoint is read before the
       first paint (the sheet is never rendered on the server), so neither placement flashes.
       A card nobody holds gets the two ways to take it, under each other, each the full width:
       side by side made a choice out of what is really two offers, the narrower one read as the
       lesser, and a binder's name can be any length. A wish gets the one thing to do with it,
       becoming a copy; the form asks what the copy is like as it arrives. It used to sit above
       the tabs, the only action not with the copies, and read as part of the title. */
    const sm = useBreakpoint("sm");
    const offer =
        mine && takeable && !rowPending && (emptied || (!mine.owned && !mine.wishlist)) ? (
            <div className="flex flex-col gap-2">
                <Button size="md" iconLeading={Plus} className="w-full" isDisabled={busy || binderPending} onClick={() => add("collection")}>
                    {binder ? `Add to ${binder.name}` : "Add to collection"}
                </Button>
                <Button size="md" color="secondary" iconLeading={Heart} className="w-full" isDisabled={busy} onClick={() => add("wishlist")}>
                    Add to wishlist
                </Button>
            </div>
        ) : mine?.wishlist && !emptied ? (
            <MarkOwnedDialog card={mine} binders={binders} languages={known?.languages} facts={formFacts} onSaved={onClose}>
                <Button size="md" className="w-full">
                    Mark as owned
                </Button>
            </MarkOwnedDialog>
        ) : null;
    const actionBar = !sm && offer;

    /* The sheet's page under the header: price, details, your copies. Built here so the print-run tabs
       can hold it in each panel, and a card with one run shows it without tabs. */
    /* The tab bar over the page: the printings, or the runs where the card has those instead. */
    const runTabs = printings
        ? {
              label: "Printing",
              items: printings.map((p) => ({ key: p.key, label: p.label })),
              selected: printingKey ?? printings[0]!.key,
              pick: (key: string) => pick({ printing: key }),
          }
        : editions
          ? {
                label: "Print run",
                items: editions.map((e) => ({ key: e.key, label: e.label })),
                selected: editionKey ?? editions[0]!.key,
                pick: (key: string) => pick({ edition: key }),
            }
          : null;

    const sheetBody = card ? (
        <>
            {mine ? (
                <section aria-labelledby="sheet-price" className="flex flex-col gap-4">
                    <h3 id="sheet-price" className="text-sm font-semibold text-primary">
                        Price
                    </h3>

                    {/* The line only: the price it ends on is under the title already (Bart, 2026-09-15). */}
                    {mine.tcg_id ? (
                        <CardPriceChart
                            tcgId={mine.tcg_id}
                            holo={isReverseFinish(mine.finish)}
                            name={card?.name}
                            printing={shownSeries ?? mine.price_printing}
                            period={period}
                            onPeriod={setPeriod}
                        />
                    ) : null}
                </section>
            ) : null}
            <section aria-labelledby="sheet-details" className="flex flex-col gap-4">
                <h3 id="sheet-details" className="text-sm font-semibold text-primary">
                    Details
                </h3>

                <dl className="flex flex-col divide-y divide-secondary">
                    <DetailRow label="Rarity" value={card.rarity} />
                    {/* From the catalogue, once it answers: who drew it, and the card's own facts. */}
                    {known?.illustrator ? <DetailRow label="Illustrator" value={known.illustrator} late /> : null}
                    {known?.hp != null ? <DetailRow label="HP" value={known.hp} late /> : null}
                    {known?.stage ? (
                        <DetailRow label="Stage" value={known.evolveFrom ? `${known.stage} · from ${known.evolveFrom}` : known.stage} late />
                    ) : null}
                    {known?.regulationMark ? <DetailRow label="Regulation mark" value={known.regulationMark} late /> : null}
                    <DetailRow
                        label="Generation"
                        value={
                            card?.gen ? (
                                <span className="flex items-center justify-end gap-2">
                                    {/* The logo is the series' own picture; the name beside it says it for a reader. */}
                                    {genLogo ? (
                                        <>
                                            <Image src={genLogo} alt="" width={96} height={24} className="h-6 w-auto max-w-28 object-contain" />
                                            <span className="sr-only">{card.gen}</span>
                                        </>
                                    ) : (
                                        card.gen
                                    )}
                                </span>
                            ) : null
                        }
                    />
                    <DetailRow
                        label="Types"
                        value={
                            card?.types?.length ? (
                                <span className="flex flex-wrap items-center justify-end gap-2">
                                    {card.types.map((t) => (
                                        <span key={t} className="flex items-center gap-1.5">
                                            <TypeIcon type={t} />
                                            {t}
                                        </span>
                                    ))}
                                </span>
                            ) : null
                        }
                    />
                    {readOnly ? <DetailRow label="Quantity" value={card?.quantity ?? 1} /> : null}
                    {/* A visitor's sheet: the printing and state the tile's second line said, in the same words
                        (copyLine), where every copy the owner holds agrees. It showed the raw finish key. */}
                    {readOnly ? <DetailRow label="Printing and condition" value={card ? copyLine(card) : null} /> : null}
                </dl>

                {mine?.notes ? (
                    <div className="flex flex-col gap-1 border-t border-secondary pt-4">
                        <p className="text-sm text-tertiary">Notes</p>
                        <p className="text-sm text-primary">{mine.notes}</p>
                    </div>
                ) : null}
            </section>
            {mine ? (
                <section aria-labelledby="sheet-copies" className="flex flex-col gap-4">
                    <h3 id="sheet-copies" className="text-sm font-semibold text-primary">
                        Your copies
                    </h3>

                    {/* None yet, and the way to change that. This section answers "what do I
                                            have of this", and for a card you do not hold the honest answer is
                                            nothing, followed by the offer, which is what you opened it for. */}
                    {/* The place of the copies while the row is on the way, as high as one copy's card. */}
                    {rowPending ? <div aria-hidden="true" className="h-72 rounded-xl bg-skeleton motion-safe:animate-pulse" /> : null}
                    {offer ? (
                        /* No card around it. A card in this app holds what you have of
                                               something, and this is the panel saying you have none; a box
                                               drawn around that reads as a copy with nothing in it. */
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-tertiary">
                                {emptied
                                    ? "That was the last copy; it has left your collection."
                                    : mine?.wishlist
                                      ? "On your wishlist; you do not hold it yet."
                                      : "You do not hold this card yet."}
                            </p>
                            {/* On a phone the two buttons are in the bar at the bottom of the
                                                    sheet instead, under the thumb; see `offer`. */}
                            {sm ? offer : null}
                        </div>
                    ) : null}
                    {/* On a wish, what you are looking for: the printing and the state you want it in, the
                        same questions a copy answers and saved the same way, so the wishlist's tile reads
                        "Holo · Near Mint" as a held one does (Bart, 2026-09-16). Marking it owned starts
                        from these. */}
                    {mine?.wishlist && !mine.owned && !emptied && !rowPending ? (
                        <CopyCard
                            wish
                            group={groupCopies([mine])[0]!}
                            binders={binders}
                            facts={formFacts}
                            busy={busy}
                            onSaved={() => scheduleRefresh()}
                            refreshBinders={async () => binders}
                        />
                    ) : null}
                    {/* One card per kind of copy you hold (Holo · Near Mint, ×4) with every field the
                                            add form asks, in its order and shape. Rows are one per purchase and nothing
                                            merged them, so four identical copies are one card saying ×4, and a change to
                                            it is made to all four. The card the sheet opened on is there at once; the
                                            other kinds arrive. */}
                    {/* Opened on a hand-filled binder's page with a card you hold that is not in
                                            it yet: the offer this page is for. The chip under "In binders" and this
                                            button trade places once it lands. */}
                    {binder && mine?.owned && !emptied && !!copies?.length && !copies.some((r) => r.collection_id === binder.id) ? (
                        <Button size="md" iconLeading={Plus} className="w-full" isDisabled={busy} onClick={fileInBinder}>
                            Add to {binder.name}
                        </Button>
                    ) : null}
                    {mine?.owned && !emptied
                        ? groupCopies(copies ?? [mine]).map((group, i) => (
                              /* Keyed on the row, not the kind: the kind's key holds the condition and
                                                     the finish, so changing one of those in the card made it a new card to
                                                     React, and the select you had just used lost its focus. The row stays
                                                     the same row through a re-read. */
                              <div key={group.shown.id} style={{ "--arrive-delay": `${Math.min(i, 8) * 20}ms` } as React.CSSProperties}>
                                  <CopyCard
                                      group={group}
                                      binders={binders}
                                      languages={known?.languages}
                                      facts={formFacts}
                                      busy={busy}
                                      arrive={!group.rows.some((r) => r.id === mine.id)}
                                      onMore={() => void stepUp(group)}
                                      onFewer={() => void stepDown(group)}
                                      onRemove={() => void dropCopies(group.rows)}
                                      onSaved={() => {
                                          scheduleRefresh();
                                          void reloadCopies();
                                      }}
                                      refreshBinders={async () => {
                                          const next = await listBinders();
                                          setBinders(next);
                                          return next;
                                      }}
                                  />
                              </div>
                          ))
                        : null}
                    {/* Where the card is: every binder any copy is filed in, every rule binder whose
                                            rule a copy fits, and Favorites when starred. A fact about the card, so it
                                            sits under the copies rather than inside one of them. */}
                    {mine?.owned && !emptied ? (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-secondary">In binders</span>
                            <ul className="flex flex-wrap gap-1.5" aria-label="In binders">
                                {[...(isStarred ? [{ id: "favorites", name: "Favorites" }] : []), ...inBinders].map(({ id, name }) => (
                                    <li key={id}>
                                        <Badge size="sm" color="gray" type="pill-color">
                                            {name}
                                        </Badge>
                                    </li>
                                ))}
                                {!isStarred && !inBinders.length ? <li className="text-sm text-quaternary">None yet</li> : null}
                            </ul>
                        </div>
                    ) : null}
                    {/* Under the card, not in it. Adding a copy makes a new row beside the ones listed
                                            above: it is not something you do to the copy the card happens to be showing,
                                            and sitting in that card's foot said it was. Full width, because it is the one
                                            thing this section is for once you have read the list. */}
                    {mine?.owned && !emptied ? (
                        <CopyFormDialog
                            mode="add"
                            languages={known?.languages}
                            facts={formFacts}
                            from={copies?.find((r) => r.id === mine.id) ?? mine}
                            binders={binders}
                            onSaved={() => void reloadCopies()}
                        >
                            <Button size="md" color="secondary" iconLeading={Plus} className="w-full">
                                Add a copy
                            </Button>
                        </CopyFormDialog>
                    ) : null}
                </section>
            ) : null}
            {/* Where to check the price: the TCGplayer page the figure came from, last on the page (Bart,
                2026-09-15). The kit's secondary button as a link, full width; it says it opens a new tab. */}
            {mine && tcgplayerUrl(mine.tcgplayer_id) ? (
                <Button href={tcgplayerUrl(mine.tcgplayer_id)!} target="_blank" rel="noreferrer noopener" color="secondary" size="sm" className="w-full">
                    TCGplayer
                    <span className="sr-only"> (opens in a new tab)</span>
                </Button>
            ) : null}
        </>
    ) : null;

    return (
        <SlideoutMenu
            isDismissable
            isOpen={!!card}
            onOpenChange={(open) => {
                if (!open) void closeSheet();
            }}
            // The whole screen on a phone, edge to edge. It used to stop short of the top by the
            // status bar plus ten points, which is iOS' page-sheet inset, and with the rounded top
            // that read as a bottom sheet: a card sitting on the page rather than a page of its own.
            // The card is the subject here, so it gets the screen, and its art runs into the corners.
            //
            // The page's own opaque ground rather than glass, so the art's fade has one colour to
            // end on, the same in both themes.
            // The bar at the bottom carries the home-indicator inset itself when it is there.
            dialogClassName={cx("scrollbar-hide h-dvh max-h-dvh gap-0 rounded-none bg-page backdrop-blur-none sm:h-full sm:max-h-full", actionBar && "pb-0")}
        >
            {({ close }) => (
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
                                                        isStarred ? (
                                                            <Star01 data-icon="leading" className={cx(buttonStyles.common.icon, "fill-current")} />
                                                        ) : (
                                                            Star01
                                                        )
                                                    }
                                                    aria-label="Favorite"
                                                    aria-pressed={isStarred}
                                                    onClick={toggleStar}
                                                    className={isStarred ? MARK_ON.favorite : "glass text-primary ring-1 ring-glass ring-inset"}
                                                />
                                            </Tooltip>
                                        ) : null}
                                        {/* What else is done to a card: copies, and taking it out. A wish can be marked owned here too. */}
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
                                                    <Dropdown.Item icon={Trash01} onAction={() => removeAndOffer(mine)}>
                                                        {mine.wishlist ? "Remove from wishlist" : "Remove from collection"}
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown.Popover>
                                        </Dropdown.Root>
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
                                            foilPattern={
                                                printing ? printing.foilPattern : (mine?.foil_pattern ?? ("foil_pattern" in card ? card.foil_pattern : null))
                                            }
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
                                                            "scale-105 object-cover blur-sm transition-opacity duration-200",
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
                            {shownPrice === null ? (
                                <p className="text-sm text-tertiary">No price for this printing</p>
                            ) : (shownPrice ?? mine?.price ?? publicPrice) != null ? (
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
                            ) : null}
                        </div>
                    </SlideoutMenu.Header>

                    {/* No scroll box of its own: the sheet is the page, and the whole of it scrolls, art and all. */}
                    {/* role="presentation": the kit defaults this to `main`, and the page already has
                        one. Two unlabelled main landmarks is worse than none, and a dialog needs no
                        landmark inside it; react-aria names the dialog from its own heading. */}
                    {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                    <SlideoutMenu.Content role="presentation" className="h-auto w-full flex-none overflow-visible pt-6 pb-6">
                        {/*
                         * One page, not three tabs (Bart, 2026-09-15): the price first, then the card's details,
                         * then what you hold of it. Over it, the card's printings (Normal, Reverse, Cosmos holo) or,
                         * for a card sold in more than one run, its runs (1st Edition, Shadowless, Unlimited), as one
                         * tab bar in one place (Bart, 2026-09-16: "overal consistent"). A card sold in more than one
                         * run is sold in one finish (#642), so one bar shows. The picture, the price, the line and the
                         * Add buttons follow the tab chosen; the line chooses its period and nothing else.
                         */}
                        {card ? (
                            runTabs ? (
                                <Tabs
                                    className="flex flex-col gap-6"
                                    selectedKey={runTabs.selected}
                                    onSelectionChange={(key) => {
                                        if (typeof key === "string") runTabs.pick(key);
                                    }}
                                >
                                    {/* Edge to edge, out into the sheet's side padding, and scrolled sideways where four
                                        tabs do not fit (Cosmos reverse and Cosmos holo on a phone): a tab running off
                                        the sheet's edge reads as more to scroll, one cut inside the padding as broken. */}
                                    <TabList
                                        aria-label={runTabs.label}
                                        type="underline"
                                        size="sm"
                                        className="-mx-4 scrollbar-hide scroll-px-4 overflow-x-auto px-4 md:-mx-6 md:scroll-px-6 md:px-6"
                                    >
                                        {runTabs.items.map((item) => (
                                            <Tab key={item.key} id={item.key} label={item.label} />
                                        ))}
                                    </TabList>
                                    {/* One panel under whichever tab is chosen, not one per tab: the page under it is
                                        the same page for every printing, so pressing another keeps the chart, the
                                        details and the copies mounted rather than building them again. */}
                                    <TabPanel id={runTabs.selected} className="flex flex-col gap-8">
                                        {sheetBody}
                                    </TabPanel>
                                </Tabs>
                            ) : (
                                <div className="flex flex-col gap-8">{sheetBody}</div>
                            )
                        ) : null}
                    </SlideoutMenu.Content>
                    {/* Last in the sheet, so the keyboard reaches it after the content, and a direct
                        child of the scroll box, which is what keeps it pinned. */}
                    {actionBar ? <SheetActionBar>{actionBar}</SheetActionBar> : null}
                </>
            )}
        </SlideoutMenu>
    );
}
