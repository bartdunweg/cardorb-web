"use client";

import { useRef } from "react";
import { Heart, Plus } from "@untitledui/icons";
import type { PeriodKey } from "@/components/app/chart-periods";
import { MarkOwnedDialog } from "@/components/app/mark-owned-dialog";
import { SheetActionBar } from "@/components/app/sheet-action-bar";
import { SheetHeader } from "@/components/app/sheet-header";
import { SheetSections } from "@/components/app/sheet-sections";
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
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { PokemonCard } from "@/lib/api-shapes";
import type { Card, PublicCard } from "@/lib/cards";
import { cx } from "@/utils/cx";

/* What a write that never answered (the network dropped, the action threw) lands as: the same
   { ok: false } every write already handles, so the panel puts its numbers back and says so
   instead of staying busy or showing a change that did not happen. */

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

/**
 * The star was turned on or off, told on the press and again if the save fails and it goes back.
 * A list of starred cards takes the row off itself here, so an unstarred card leaves Favorites on
 * the press rather than when the page has been read again.
 */
type Starred = { onStarChanged?: (cardId: string, starred: boolean) => void };

type Props = ({ card: Card | null; onClose: () => void; readOnly?: false } | { card: PublicCard | null; onClose: () => void; readOnly: true }) &
    Neighbours &
    Addable &
    Period &
    Starred;

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
    onStarChanged,
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
    const { isStarred, toggleStar } = useSheetStar({ card, mine, scheduleRefresh, onStarChanged });
    const cardArt = useCardArt({
        card,
        pressedImage,
        stepFromRef,
    });
    const titleRef = useRef<HTMLHeadingElement>(null);

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
        <SheetSections
            card={card}
            mine={mine}
            readOnly={readOnly}
            rowPending={rowPending}
            known={known}
            formFacts={formFacts}
            genLogo={genLogo}
            shownSeries={shownSeries}
            period={period}
            setPeriod={setPeriod}
            offer={offer}
            sm={sm}
            emptied={emptied}
            busy={busy}
            binders={binders}
            setBinders={setBinders}
            facets={facets}
            binder={binder}
            copies={copies}
            isStarred={isStarred}
            fileInBinder={fileInBinder}
            stepUp={stepUp}
            stepDown={stepDown}
            dropCopies={dropCopies}
            scheduleRefresh={scheduleRefresh}
            reloadCopies={reloadCopies}
        />
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
                    <SheetHeader
                        card={card}
                        mine={mine}
                        rowPending={rowPending}
                        titleRef={titleRef}
                        close={close}
                        closeSheet={closeSheet}
                        busy={busy}
                        isStarred={isStarred}
                        toggleStar={toggleStar}
                        removeAndOffer={removeAndOffer}
                        cardArt={cardArt}
                        onPrev={onPrev}
                        onNext={onNext}
                        step={step}
                        printing={printing}
                        known={known}
                        shownPrice={shownPrice}
                        publicPrice={publicPrice}
                        shownChange={shownChange}
                    />

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
