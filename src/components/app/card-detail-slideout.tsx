"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, DotsHorizontal, Heart, Phone01, Plus, Star01, Trash01, XClose } from "@untitledui/icons";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type CardFacts, type PricePoint, addCard, editCopies, removeCard, restoreCard, setCopies, setFavorite } from "@/app/(app)/dashboard/cards/actions";
import type { BinderChoice } from "@/app/(app)/dashboard/collections/actions";
import { NO_ART, artStack, nextArt } from "@/components/app/card-art";
import { CardBack } from "@/components/app/card-back";
import { CardImage, preloadCardImage } from "@/components/app/card-image";
import { knownCardFacts, knownPriceHistory, knownRows, preloadCardFacts, preloadPriceHistory, rememberCopies } from "@/components/app/card-memo";
import { CardPriceChart } from "@/components/app/card-price-chart";
import { PERIODS, type PeriodKey } from "@/components/app/chart-periods";
import { CopyCard } from "@/components/app/copy-card";
import { CopyFormDialog } from "@/components/app/copy-form-dialog";
import { HoloCard } from "@/components/app/holo-card";
import { MarkOwnedDialog } from "@/components/app/mark-owned-dialog";
import { editionChoices, openingChoice, pressedPrinting, printingChoices } from "@/components/app/printing-choices";
import { SheetActionBar } from "@/components/app/sheet-action-bar";
import { SheetBar } from "@/components/app/sheet-bar";
import { type StepFrom, stepMotion } from "@/components/app/step-motion";
import { MARK_ON } from "@/components/app/tile-icon-button";
import { notify } from "@/components/app/toast";
import { TypeIcon } from "@/components/app/type-icon";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button, styles as buttonStyles } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { PokemonCard, RemovedCard } from "@/lib/api-shapes";
import { binderFromPath, isBinderPath } from "@/lib/binder-from-path";
import { matchesRule } from "@/lib/binder-rule";
import { cardLabel, cardLabelFull, copyLine } from "@/lib/card-label";
import { type Finish, isReverseFinish } from "@/lib/card-shapes";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { type CopyGroup, groupCopies, sortCopies } from "@/lib/copies";
import { forgetMineQuietly } from "@/lib/forget-mine";
import { formatPrice } from "@/lib/format";
import { orientationNeedsPermission, requestOrientation } from "@/lib/holo/orientation";
import { periodChange } from "@/lib/price-change";
import { tcgplayerUrl } from "@/lib/price-links";
import { listBinders, listCopies, loadFacets, seriesLogo } from "@/lib/reads";
import { settleLatest } from "@/lib/settle-latest";
import { orFailed } from "@/lib/write-outcome";
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
    const router = useRouter();
    // The owner's fields exist only on the editable view; the public view never receives them.
    // The row the sheet shows: the one it opened on, or another copy of the card tapped in the
    // Copies tile. Kept with the card it was chosen for, so a new card opens on its own row.
    const [viewing, setViewing] = useState<{ of: string; row: Card } | null>(null);
    const mine = readOnly ? null : viewing && card && viewing.of === card.id ? viewing.row : (card as Card | null);
    // Every row of this card the person holds, read when the sheet opens and after each write.
    const copiesKey = (c: Card) => `${c.set_name ?? c.set ?? ""}|${c.number ?? ""}|${c.name}`;
    const [copiesState, setCopiesState] = useState<{ of: string; rows: Card[] } | null>(null);
    /* Before this sheet has read them, the copies the page already had (a set page's rows,
       card-memo.ts), where they include the row shown: then every kind is there on the first paint. */
    const pageCopies = mine?.owned ? knownRows(mine)?.filter((r) => r.owned) : undefined;
    const copies = mine && copiesState?.of === copiesKey(mine) ? copiesState.rows : pageCopies?.some((r) => r.id === mine?.id) ? sortCopies(pageCopies) : null;
    /* Counts the presses the sheet has answered on screen before the store has. A read that
       started before one of those would put the old number back over the new one, so it is
       dropped; the press that made it stale reads again once its write has landed. */
    const pressed = useRef(0);
    // The card on screen now, for a read that answers after the arrows stepped on to another one.
    const shownCard = useRef(card);
    useEffect(() => {
        shownCard.current = card;
    }, [card]);
    const reloadCopies = async (row: Card | null = mine) => {
        if (!row || !row.owned) return;
        const asOf = pressed.current;
        const readFor = card?.id;
        const rows = sortCopies(await listCopies(row));
        if (asOf !== pressed.current) return;
        rememberCopies(row, rows);
        // A late answer for card A is kept in the memo but does not touch the sheet now showing card B.
        if (shownCard.current?.id !== readFor) return;
        setCopiesState({ of: copiesKey(row), rows });
        /* A row that is gone (removed, merged away, or put back under a new id) cannot stay the one
           shown: the sheet moves to the first row left, so the star and the copy form act on a row
           that exists. */
        const shownId = viewing?.of === card?.id ? viewing?.row.id : row.id;
        if (card && !rows.some((r) => r.id === shownId)) setViewing(rows[0] ? { of: card.id, row: rows[0] } : null);
    };
    // A new copy as a row of its own, made like the row shown, pulled today; the sheet moves to
    // it so what differs can be set at once.
    /* One copy of several. The sheet stays open on whatever is left, so removing the row you were
       reading moves you to the first one rather than closing the card out from under you. */
    /* A card the sheet has just emptied stays on screen as a card you could take again, so the
       last minus is not a door slamming. The set page hands one of these in; everywhere else the
       card on screen is enough to build it. */
    const [removed, setRemoved] = useState<string | null>(null);
    const emptied = !!card && removed === card.id;
    /* A line is a kind of copy, so the bin on it removes every row behind it. Removing one of four
       identical rows would leave a line still saying ×3 and nothing to show for the press. */
    const dropCopies = async (group: Card[]) => {
        if (!mine || !card || !group.length) return;
        /* Gone from the panel at once; the store follows. A failure reads the rows back. */
        const gone = new Set(group.map((r) => r.id));
        const rows = (copies ?? [mine]).filter((r) => !gone.has(r.id));
        pressed.current += 1;
        setCopiesState({ of: copiesKey(mine), rows });
        if (gone.has(mine.id) && rows[0]) setViewing({ of: card.id, row: rows[0] });
        setBusy(true);
        /* At once, not one after another. Each of these is a round trip from the browser through
           the app to the API and on to the database in another region, so a group of four in a
           `for await` was four of those in a queue: the wait grew with the number of copies, on
           the one action where the number of copies is the whole point. They touch different rows,
           so nothing is racing. None of them forgets (reread: false): each forgetting in its own
           answer drew the page again once per copy, and those redraws queued behind one another.
           The cache is dropped once, quietly, when they have all landed, failed ones included,
           since the others may still have removed their rows. */
        const results = await Promise.all(group.map((row) => orFailed(removeCard(row.id, { reread: false }))));
        setBusy(false);
        const forgotten = forgetMineQuietly("cards");
        const failed = results.find((r) => !r.ok);
        if (failed && !failed.ok) {
            notify.failed(group.length > 1 ? "Those copies were not removed" : "That copy was not removed", { description: failed.error });
            void forgotten.then(() => {
                scheduleRefresh();
                void reloadCopies();
            });
            return;
        }
        offerUndo(
            results.flatMap((r) => (r.ok && r.card ? [r.card] : [])),
            group.length > 1 ? `${group.length} copies removed` : "Copy removed",
        );
        // Nothing left: the sheet says so, rather than staying on a row that is gone with "Add a
        // copy" and the star still writing to it. Only the minus's own path said it before.
        if (!rows.length && card) setRemoved(card.id);
        void forgotten.then(scheduleRefresh);
    };
    /* Read-only sheets never take a card, so the public shape is not asked to answer for one. */
    const own = readOnly ? null : (card as Card | null);
    const takeable: PokemonCard | null =
        addable ??
        (own
            ? {
                  id: own.id,
                  name: own.name,
                  // The official name: what every catalogue add sends, and what a new row is filed under.
                  set: own.set_name ?? own.set ?? "",
                  number: own.number ?? "",
                  rarity: own.rarity,
                  image: own.image_url,
                  supertype: null,
                  subtypes: null,
                  hp: null,
                  types: own.types?.length ? own.types : null,
                  artist: null,
                  series: null,
                  releaseDate: null,
                  setPrintedTotal: null,
                  flavorText: null,
                  nationalPokedexNumbers: null,
                  owned: false,
                  wishlist: false,
                  quantity: 0,
                  price: own.price,
              }
            : null);

    const [binders, setBinders] = useState<BinderChoice[]>([]);
    /* The hand-filled binder whose page this sheet was opened on, if any: a card taken here goes
       into it as well. Read from the path, the one fact every mounted sheet shares: the palette's
       sheet hangs from the layout, beside the page, out of reach of anything the page provides. */
    const pathname = usePathname();
    const binder = readOnly ? null : binderFromPath(pathname, binders);
    // On a binder's page before the binder list has answered: the press would file nowhere, so it waits a beat.
    const binderPending = !readOnly && isBinderPath(pathname) && binders.length === 0;

    /* Taking a card the sheet was only showing. The sheet closes on the press, with the toast, and
       the write follows: it waited for the write and then for the list behind to be drawn again, a
       spinner on a card already chosen. What it was showing is not what it is now, and the row it
       became has its own copies. A write that fails says so; nothing was marked, so nothing goes back. */
    const add = (list: "collection" | "wishlist") => {
        if (!takeable) return;
        const taken = takeable;
        const into = list === "collection" ? binder : null;
        const where = list === "wishlist" ? "your wishlist" : into ? into.name : "your collection";
        setRemoved(null);
        onClose();
        notify.done(`Added to ${where}`, { description: taken.name });
        const putBack = onTaking?.(taken, list);
        /* The printing and run pressed under the card, where the sheet offers a choice (Bart,
           2026-09-15): you add the one you are looking at. Otherwise the API's own default. */
        void orFailed(
            addCard(taken, list, into?.id, {
                printing: printing ? { finish: printing.finish, foilPattern: printing.foilPattern } : undefined,
                edition: edition ?? undefined,
                reread: false,
            }),
        ).then((res) => {
            if (!res.ok) {
                notify.failed(`That card was not added to ${where}`, { description: res.error });
                putBack?.();
                return;
            }
            // The write forgot nothing (reread: false), so a refresh on its own drew the sidebar's
            // counts from the cache as they were before the add.
            const forgotten = forgetMineQuietly("cards");
            if (onTaken) onTaken(taken, list, res.id);
            else void forgotten.then(() => router.refresh());
        });
    };
    /* A card you hold, into the binder this page is: the first row not yet in a binder, else the
       row shown, which then moves. A row is one kind of copy, so ×4 goes as four, as the Binder
       select on a copy does it. Only a row the store has answered with: a sheet opened from the
       palette shows the catalogue's card until its rows land, and that card's id is no row's. */
    /* Filed on the press: the row says the binder at once, so the button and the chip under "In
       binders" trade places under the finger, and the write follows. It used to hold every button
       in the sheet through the write and the list behind drawn inside the action's answer. A write
       that fails puts the rows back and says so. */
    const fileInBinder = () => {
        if (!mine || !binder || !copies?.length) return;
        const into = binder;
        const before = copies;
        const row = copies.find((r) => r.collection_id === null) ?? copies[0];
        pressed.current += 1;
        setCopiesState({ of: copiesKey(mine), rows: copies.map((r) => (r.id === row.id ? { ...r, collection_id: into.id } : r)) });
        notify.done(`Added to ${into.name}`, { description: row.collection_id ? "Moved from another binder" : mine.name });
        void orFailed(editCopies([row.id], { collectionId: into.id }, { reread: false })).then((res) => {
            if (!res.ok) {
                pressed.current += 1;
                setCopiesState({ of: copiesKey(mine), rows: before });
                notify.failed(`${mine.name} was not added to ${into.name}`, { description: res.error });
                return;
            }
            void forgetMineQuietly("cards").then(() => {
                scheduleRefresh();
                void reloadCopies();
            });
        });
    };
    const [facets, setFacets] = useState<Facets | undefined>(undefined);
    /*
     * The star, kept here so a tap answers at once: it fills or empties on the press and the save
     * runs behind it, with no spinner, because a favourite is a mark and not a task to wait for.
     * Bart's call, 2026-09-13. The button stays pressable while a save is out, so the writes go
     * one after the other (a second tap cannot land before the first), and only the last tap's
     * failure puts the star back, to what it was before that tap.
     */
    // Kept with the row it was pressed on, so a save that fails after the arrows moved on puts
    // back that card's star and not the one now showing.
    const [starred, setStarred] = useState<{ id: string; on: boolean } | null>(null);
    const isStarred = starred && starred.id === mine?.id ? starred.on : (mine?.is_favorite ?? false);
    const starWrites = useRef<Promise<unknown>>(Promise.resolve());
    const starTaps = useRef(0);
    const toggleStar = () => {
        if (!mine) return;
        const id = mine.id;
        const next = !isStarred;
        const tap = ++starTaps.current;
        setStarred({ id, on: next });
        // Written without the re-read (the page drawn inside each answer held the next tap's write
        // in Next's action queue), and the cache dropped once the last tap has landed, either way:
        // the taps before it may have written.
        const write = starWrites.current.then(() => setFavorite(id, next, { reread: false }));
        starWrites.current = write.catch(() => undefined);
        void write.then(
            (res) => {
                if (tap !== starTaps.current) return;
                const forgotten = forgetMineQuietly("favorite");
                if (res.ok) void forgotten.then(scheduleRefresh);
                else {
                    setStarred({ id, on: !next });
                    notify.failed(next ? "That card is not a Favorite" : "That card is still a Favorite", { description: res.error });
                }
            },
            () => {
                if (tap !== starTaps.current) return;
                void forgetMineQuietly("favorite");
                setStarred({ id, on: !next });
                notify.failed(next ? "That card is not a Favorite" : "That card is still a Favorite");
            },
        );
    };
    // The generation's logo, asked for when a card opens; kept with the series it was read for.
    const [logo, setLogo] = useState<{ series: string; url: string | null } | null>(null);
    const gen = card?.gen ?? null;
    useEffect(() => {
        if (!gen) return;
        let live = true;
        seriesLogo(gen).then((url) => {
            if (live) setLogo({ series: gen, url });
        });
        return () => {
            live = false;
        };
    }, [gen]);
    const genLogo = logo?.series === gen ? logo.url : null;
    // What the catalogue knows about the printing: read when a card opens, kept with its id.
    //
    // Seeded from the card memo, which is why a card opened twice fills in at once rather than a
    // half-second later with its rows animating: measured, the sheet is on screen at 92 ms and
    // the catalogue answers at 559 ms, and the `arrive` on those rows spends that gap drawing
    // attention to it. The second time there is no gap to draw.
    const [facts, setFacts] = useState<{ tcgId: string; facts: CardFacts | null } | null>(null);
    const [history, setHistory] = useState<{ tcgId: string; points: PricePoint[] } | null>(null);
    const tcgId = card?.tcg_id ?? null;
    /* The catalogue the card is from: a card taken off a Japanese set page says so, and a copy of one
       carries its language. Its facts are asked of that catalogue (card-memo.ts). */
    const catalogue = addable?.language === "ja" || (card && "language" in card && card.language === "ja") ? "ja" : "en";
    useEffect(() => {
        if (!tcgId) return;
        // The price line too, so the price section opens on it rather than on "No readings" for the
        // half second the API takes. The header's arrow reads the same answer, for its average.
        let live = true;
        preloadPriceHistory(tcgId).then((points) => {
            if (live) setHistory({ tcgId, points });
        });
        return () => {
            live = false;
        };
    }, [tcgId]);
    useEffect(() => {
        if (!tcgId) return;
        if (knownCardFacts(tcgId, catalogue) !== undefined) return;
        let live = true;
        preloadCardFacts(tcgId, catalogue).then((f) => {
            if (live) setFacts({ tcgId, facts: f });
        });
        return () => {
            live = false;
        };
    }, [tcgId, catalogue]);
    /*
     * Read from what was fetched, or from what a previous open already learned. Derived rather
     * than copied into state, so a card whose answer is already known needs no effect and no
     * render to show it.
     *
     * That is the whole of it: measured, the sheet is on screen at 63 ms and the catalogue
     * answers at 739 ms, and the `arrive` on those rows spends the gap between drawing attention
     * to it. Opened a second time there is no gap, so nothing animates.
     */
    // The copy forms are told the wait apart from no answer: undefined until the catalogue answers, and they offer nothing yet (copy-fields).
    const formFacts = tcgId ? (facts?.tcgId === tcgId ? facts.facts : knownCardFacts(tcgId, catalogue)) : null;
    const known = formFacts ?? null;
    // The line beside the price in the header: how far this printing moved over the period the
    // chart under it is drawing, out of the card's own history. The period lives here rather than
    // in the chart, so pressing 7D moves the number and the line together.
    const points = tcgId ? (history?.tcgId === tcgId ? history.points : (knownPriceHistory(tcgId) ?? [])) : [];
    const [periodState, setPeriodState] = useState<{ opensOn: PeriodKey; period: PeriodKey }>({ opensOn, period: opensOn });
    // A list with a period of its own (Home's movers) opens every card it hands over on that one.
    if (periodState.opensOn !== opensOn) setPeriodState({ opensOn, period: opensOn });
    const period = periodState.period;
    const setPeriod = (next: PeriodKey) => setPeriodState({ opensOn, period: next });
    const chosen = PERIODS.find((p) => p.key === period) ?? PERIODS[1];
    const change = mine ? periodChange(points, period, isReverseFinish(mine.finish), mine.price_printing ?? null, chosen.said) : null;

    /*
     * The arrow keys, which is how anybody who is already looking at a list expects to move
     * through it. Only when nothing is being typed into: the sheet holds a note field and a
     * grade box, and a left arrow inside those belongs to the cursor.
     */
    /*
     * Which way the list was stepped and how, kept for the art below (`stepMotion`): after a chevron
     * the next card slides in from the side its arrow sits on and the last one leaves through the
     * other; after an arrow key it fades in place, and a held key's repeats draw it at once. Zero
     * when the sheet opened on this card, so there is nothing to slide from.
     */
    const stepFrom = useRef<StepFrom>({ dir: 0, key: false, repeat: false });
    const step = useCallback(
        (dir: -1 | 1, key?: { repeat: boolean }) => {
            const go = dir < 0 ? onPrev : onNext;
            if (!go) return;
            stepFrom.current = { dir, key: !!key, repeat: key?.repeat ?? false };
            go();
        },
        [onPrev, onNext],
    );
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const el = e.target as HTMLElement | null;
            /* Not only the fields: react-aria's tab list moves between tabs with the arrow keys,
               and the price chart's arrows are the only way to reach its individual figures, the
               whole of its text alternative. Both sat under this handler, so on the Price tab a
               right arrow threw you onto another card instead of reading the next price. */
            if (
                el?.closest(
                    // The kit's Select is a button with a listbox behind it, and react-aria moves its
                    // selection with these keys: one ArrowRight on a copy's Language saved the next
                    // language to every row of that kind and stepped to the next card in one press.
                    "input, textarea, select, [aria-haspopup='listbox'], [contenteditable='true'], [role='tab'], [role='tablist'], [role='menu'], [role='menuitem'], [role='listbox'], [role='option'], [role='slider'], [tabindex]:not([tabindex='-1']) svg, figure",
                )
            )
                return;
            // A second dialog over the sheet (Add a copy, Mark as owned, the palette) owns the keys:
            // stepping the card under an open form wrote the form's values to the next card's id.
            if (document.querySelectorAll("[role='dialog']").length > 1) return;
            if (e.key === "ArrowLeft") step(-1, { repeat: e.repeat });
            if (e.key === "ArrowRight") step(1, { repeat: e.repeat });
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [step]);
    // On an iPhone the card can follow the phone's tilt once the browser has asked; a Tilt button
    // in the bar is the tap it asks from. The question is the browser's, read as an external store,
    // false on the server, so both renders agree.
    const tiltNeedsAsk = useSyncExternalStore(
        () => () => {},
        () => orientationNeedsPermission(),
        () => false,
    );
    const [tiltGranted, setTiltGranted] = useState(false);
    const askTilt = async () => {
        if (await requestOrientation()) setTiltGranted(true);
    };
    const canTilt = tiltNeedsAsk && !tiltGranted;
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
    // The dots menu's actions: each one server call, then the page re-reads; removing closes the sheet
    // first, since the card it showed is gone.
    const [busy, setBusy] = useState(false);
    /* The list behind the sheet re-reads after a write, but not after each one: a run of presses
       is one change to it, and a re-read per press had every one of them competing with the next
       write for the same connection. Closing the sheet takes whatever is still waiting with it. */
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleRefresh = () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
            refreshTimer.current = null;
            router.refresh();
        }, 500);
    };
    const flushRefresh = () => {
        if (!refreshTimer.current) return;
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
        router.refresh();
    };
    /* How many of a kind. Plus adds one to the row on screen for it. Minus takes one from a row
       that holds more than one, and otherwise drops a whole row of the kind, since four identical
       copies are four rows of one in the store. The last one may go: the panel answers at once
       with the two ways to take it back.

       The number changes under the finger. It used to wait for the write to land in another
       region and then for the rows to be read back, two round trips, with the button looking
       dead in between. Now the panel shows the new count and the store catches up: one write in
       the air per row, always for the last count pressed, and the rows are read back once it has
       landed. A write that fails puts the store's number back and says so. */
    const [settleQuantity] = useState(() => settleLatest((id: string, quantity: number) => setCopies(id, quantity, { reread: false })));
    const showQuantity = (row: Card, quantity: number) => {
        if (!mine) return;
        pressed.current += 1;
        const base = copies ?? [mine];
        setCopiesState({ of: copiesKey(mine), rows: base.map((r) => (r.id === row.id ? { ...r, quantity } : r)) });
        void settleQuantity(row.id, quantity, (error) => {
            notify.failed("The number of copies did not change", { description: error });
        }).then((landed) => {
            // null is a press folded into one still flying; that one re-reads for both. The
            // writes forget nothing themselves (setCopies, reread: false): the cache is dropped
            // here, once, when no write is in the air to race the re-read that fills it again.
            // A failed run may still have landed its first presses, so it re-reads too.
            if (landed === null) return;
            // Quietly, through the route: rereadMine() is an action, and a cache dropped inside one
            // draws the page again in its answer, a redraw of the list behind the sheet on top of the
            // refresh this schedules.
            void forgetMineQuietly("cards").then(() => {
                scheduleRefresh();
                void reloadCopies();
            });
        });
    };
    const stepUp = (group: CopyGroup) => {
        const row = group.shown;
        showQuantity(row, (row.quantity ?? 1) + 1);
    };
    const stepDown = async (group: CopyGroup) => {
        const many = group.rows.find((r) => (r.quantity ?? 1) > 1);
        if (many) return showQuantity(many, (many.quantity ?? 1) - 1);
        // Any row but the one the sheet opened on, so what it shows stays as long as it can.
        const spare = group.rows.find((r) => r.id !== mine?.id) ?? group.rows[0];
        if (!spare) return;
        await dropCopies([spare]);
    };

    const closeSheet = async () => {
        flushRefresh();
        // The next card, or this one again, opens on its own row.
        setViewing(null);
        onClose();
    };
    /* A way back that puts the row back whole. The rows live only in this closure, for as long as
       the toast is up: the API keeps nothing, so an undo nobody presses costs nothing and leaves
       nothing behind. An API that has not deployed the change yet hands back no row, and then
       there is nothing to offer: the removal stands and says so without an Undo, which is better
       than a button that would quietly create a card missing everything it held. */
    const offerUndo = (rows: RemovedCard[], done: string) => {
        if (!rows.length) return notify.removed(done);
        notify.removed(done, {
            undo: {
                label: "Put back",
                onUndo: () => {
                    // Forgotten once for the lot, quietly, as the removal was (dropCopies says why).
                    void Promise.all(rows.map((row) => orFailed(restoreCard(row, { reread: false })))).then(async (results) => {
                        const failed = results.find((r) => !r.ok);
                        if (failed && !failed.ok) notify.failed("That did not go back", { description: failed.error });
                        else {
                            setRemoved(null);
                            notify.done(rows.length > 1 ? `${rows.length} copies are back` : "It is back");
                        }
                        await forgetMineQuietly("cards");
                        scheduleRefresh();
                        void reloadCopies();
                    });
                },
            },
        });
    };

    /* Closed on the press and written after, as the add is: the sheet waited for the delete and the
       redraw with its menu spinning. The toast comes with the answer, because its way back is the row
       the delete hands back. */
    const removeAndOffer = (row: Card) => {
        const wishlist = !!row.wishlist;
        onClose();
        onRemoved?.(row);
        void orFailed(removeCard(row.id, { reread: false })).then((res) => {
            if (!res.ok) {
                notify.failed(wishlist ? "That card is still on your wishlist" : "That card is still in your collection", { description: res.error });
                router.refresh();
                return;
            }
            const forgotten = forgetMineQuietly("cards");
            if (!onRemoved) void forgotten.then(() => router.refresh());
            offerUndo(res.card ? [res.card] : [], wishlist ? "Removed from your wishlist" : "Removed from your collection");
        });
    };

    // The binders and the facets are for the sheet's own controls, so they are asked for when a
    // card first opens, not when the page mounts: this sits on every list page, closed, and used
    // to cost two calls on every visit for a sheet nobody had opened.
    // The card's copies, read when a card opens; the list behind hands the sheet one row.
    const opened = !readOnly && (card as Card | null)?.owned ? (card as Card) : null;
    const openedId = opened?.id ?? null;
    useEffect(() => {
        if (!opened) return;
        let live = true;
        const asOf = pressed.current;
        listCopies(opened).then((rows) => {
            if (live && asOf === pressed.current) {
                rememberCopies(opened, rows);
                setCopiesState({ of: copiesKey(opened), rows: sortCopies(rows) });
            }
        });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openedId]);
    const askedForChoices = useRef(false);
    useEffect(() => {
        if (readOnly || !card || askedForChoices.current) return;
        askedForChoices.current = true;
        listBinders().then(setBinders);
        loadFacets().then(setFacets);
    }, [readOnly, card]);

    // Reset the editable collection value when a different card opens, done during render (React's
    // documented pattern for adjusting state on prop change) rather than in an effect.
    const [syncedCardId, setSyncedCardId] = useState(card?.id);
    if (card?.id !== syncedCardId) {
        setSyncedCardId(card?.id);
        setStarred(null);
    }

    /*
     * Stepping through a list with the arrows swapped the art in one frame: the header's colour
     * jumped and the card teleported. Now the art crosses over. The last card's scan and blurred
     * copy stay underneath while the next card's are fetched, and each fades in over them once
     * its own picture is on screen, not on mount, or the fade would run on an empty box and the
     * picture still pop in after it. The blurred copy is opacity only. The scan also travels:
     * 12 px in from the side its arrow sits on while the last one slides 12 px out the other way,
     * so stepping through a list reads as paging rather than as one card replaced by another.
     * 250 ms on the enter curve: this runs on every arrow press, so it stays small. Reduced
     * motion drops the travel and keeps the fade.
     *
     * The picture underneath is the very element that was showing the last card, not a copy of
     * it. It used to be a copy: a second <img> mounted at the moment of the step, and an <img>
     * that has just been put in the page paints nothing until the browser has decoded it, even
     * from cache, and next/image asks for that decode off the main thread. So for the first
     * frames after a press both layers were empty and the page's ground showed through the head:
     * a white blink on every step on a phone, where the decode takes longest. Now the layers are
     * a keyed list (`artStack`), the key being the scan's address: the last card's element stays
     * where it is and only becomes the one underneath, and the new one is added over it. The
     * scans sit inside the tilting card together, so a card tilted under the pointer cannot show
     * the one underneath peeking out beside it. The layer underneath goes once the fade has
     * ended. Adjusted during render, the same way as the collection value above.
     */
    /*
     * The printing on show, under the card (printing-choices.ts): the copy's own to begin with,
     * and whichever button was pressed after that, until the sheet moves to another card. A
     * printing with its own photo shows that photo; any other shows the card's scan with that
     * printing's foil over it.
     */
    const printings = printingChoices(known);
    const editions = editionChoices(known?.editions, known?.editionPictures);
    // The printings' and the runs' own pictures fetched as soon as the sheet knows them, at the sizes the head and the
    // frame draw, so pressing one swaps the card at once instead of after its download.
    // A cosmos print's shine is three textures (268 KB) the vendored effect only asks for once it is on
    // screen, so the first press of Cosmos waited for those too.
    const printingImages = [...(printings ?? []), ...(editions ?? [])].flatMap((p) => (p.image ? [p.image] : [])).join("|");
    const hasCosmos = !!printings?.some((p) => p.foilPattern === "cosmos");
    useEffect(() => {
        for (const image of printingImages ? printingImages.split("|") : []) {
            preloadCardImage(image, 176, 75);
            preloadCardImage(image, 64, 60);
        }
        if (hasCosmos)
            for (const texture of ["cosmos-bottom.png", "cosmos-middle-trans.png", "cosmos-top-trans.png"]) new window.Image().src = `/holo/${texture}`;
    }, [printingImages, hasCosmos]);
    // On a public page the card's own printing is the one it opens on, as it is for its owner.
    const held = mine ?? (readOnly ? card : null);
    const ownPrinting = held?.finish ? (held.foil_pattern ? `${held.finish}/${held.foil_pattern}` : held.finish) : null;
    const [picked, setPicked] = useState<{ tcgId: string | null; printing: string | null; edition: string | null }>({
        tcgId: null,
        printing: null,
        edition: null,
    });
    const pickedHere = picked.tcgId === tcgId ? picked : null;
    const openingPrinting = openingChoice(printings, ownPrinting);
    // A card you do not hold opens on its unlimited run, not on the 1st Edition's price.
    const openingEdition = openingChoice(editions, mine?.edition, "unlimited");
    const printingKey = pickedHere?.printing ?? openingPrinting;
    const editionKey = pickedHere?.edition ?? openingEdition;
    const printing = printings?.find((p) => p.key === printingKey) ?? null;
    const editionChoice = editions?.find((e) => e.key === editionKey) ?? null;
    const edition = editionChoice?.key ?? null;
    // A run's own picture shows as a printing's does; a card has one group or the other, never both.
    const pressedImage = printing?.image ?? editionChoice?.image ?? null;
    const pick = (next: { printing?: string; edition?: string }) => {
        // A printing is not a step through the list: the new picture fades in where it is.
        stepFrom.current = { dir: 0, key: false, repeat: false };
        setPicked({ tcgId, printing: next.printing ?? printingKey, edition: next.edition ?? editionKey });
    };
    /*
     * The price above follows the buttons (Bart, 2026-09-15). On the printing the sheet opened on it
     * is the copy's own price, as before; another one reads that printing's latest figure from the
     * card's history, or a pattern print's own figure. `undefined` is "the copy's price", null is
     * "that printing has none".
     */
    const pressedAway = (printing && printingKey !== openingPrinting) || (editionKey && editionKey !== openingEdition);
    const patternPrice = printing?.foilPattern
        ? known?.patternPrints?.prints.find((p) => p.finish === printing.finish && p.foilPattern === printing.foilPattern)?.price?.market
        : undefined;
    /* A public card with no price field is one whose owner keeps prices private: another printing
       pressed there must not bring a market figure in through the catalogue's history. */
    const pricesHidden = readOnly && !(card && "price" in card);
    const { series: shownSeries, price: pressedPrice } = pressedPrinting({
        pressedAway: !!pressedAway,
        finish: printing?.finish ?? (mine?.finish as Finish | null) ?? "normal",
        edition,
        foilPattern: printing?.foilPattern ?? null,
        latest: points.at(-1)?.printings,
        patternPrice,
    });
    const shownPrice = pricesHidden ? undefined : pressedPrice;
    const shownChange = pressedAway ? (shownPrice != null && shownSeries ? periodChange(points, period, false, shownSeries, chosen.said) : null) : change;
    // On a public page the card carries a price only where its owner shows them; that is the figure under the title then.
    const publicPrice = readOnly && card && "price" in card ? (card.price ?? null) : null;
    const [art, setArt] = useState(NO_ART);
    const [scanLoaded, setScanLoaded] = useState(false);
    const [blurLoaded, setBlurLoaded] = useState(false);
    const scanFade = useRef<HTMLDivElement>(null);
    const prevScan = useRef<HTMLDivElement>(null);
    const blurFade = useRef<HTMLDivElement>(null);
    const fades = useRef<{ scan?: Animation; blur?: Animation; prev?: Animation }>({});
    const artNow = nextArt(art, pressedImage && card ? { image_url: pressedImage, image_high_url: null } : card);
    if (artNow !== art) {
        setArt(artNow);
        setScanLoaded(false);
    }
    /*
     * The blurred copy behind the head is the card's own picture, not the printing on show: pressing
     * Reverse or Cosmos holo swaps the card and leaves the colour behind it where it was, so nothing
     * but the card has to load again (Bart, 2026-09-15). It changes only with the card.
     */
    const [backdrop, setBackdrop] = useState(NO_ART);
    const backdropNow = nextArt(backdrop, card);
    if (backdropNow !== backdrop) {
        setBackdrop(backdropNow);
        setBlurLoaded(false);
    }
    /*
     * The fade is a Web Animation started the moment the picture reports in, not a class the
     * layer transitions to. A cached picture reports in the same task that made its layer
     * transparent, and a class flipped back within that task is never seen by the browser: it
     * styles the end state once and nothing crosses. An animation started then plays from zero
     * whatever the base style does underneath it. Both pictures are keyed by their address, so a
     * new picture is a fresh <img>: on a reused one Chrome still calls the old request complete
     * for a tick after the address changes, and next/image took that for the new picture being there.
     */
    const landed = (which: "scan" | "blur", layer: React.RefObject<HTMLDivElement | null>, set: (v: boolean) => void, done?: () => void) => () => {
        set(true);
        fades.current[which]?.cancel();
        fades.current.prev?.cancel();
        const el = layer.current;
        if (!el) return;
        const from: StepFrom = which === "scan" ? stepFrom.current : { dir: 0, key: false, repeat: false };
        const motion = stepMotion(from, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        // A held arrow key: the picture is simply there, and the one under it goes with it.
        if (!motion) {
            done?.();
            return;
        }
        const tokens = getComputedStyle(el);
        const easing = tokens.getPropertyValue("--ease-enter").trim() || "ease-out";
        const travel = motion.travel;
        const duration = parseFloat(tokens.getPropertyValue(`--duration-${motion.duration}`)) || (motion.duration === "instant" ? 100 : 200);
        const fade = el.animate(
            [
                { opacity: 0, transform: `translateX(${travel}px)` },
                { opacity: 1, transform: "translateX(0)" },
            ],
            { duration, easing },
        );
        fades.current[which] = fade;
        if (done) fade.onfinish = done;
        // The last scan leaves the way the new one came, or it would peek out beside the new
        // one for the length of its travel.
        const under = which === "scan" ? prevScan.current : null;
        if (under && travel) {
            fades.current.prev = under.animate(
                [
                    { opacity: 1, transform: "translateX(0)" },
                    { opacity: 0, transform: `translateX(${-travel}px)` },
                ],
                {
                    duration,
                    easing,
                    fill: "forwards",
                },
            );
        }
    };
    // Stepping on before the last fade finished: its finish would have cleared the scan the
    // next card now needs underneath, so it is cancelled with the card it belonged to.
    useEffect(() => {
        const running = fades.current;
        return () => {
            running.scan?.cancel();
            running.prev?.cancel();
        };
    }, [art.shown?.scan]);
    useEffect(() => {
        const running = fades.current;
        return () => running.blur?.cancel();
    }, [backdrop.shown?.scan]);
    // Stepped back to the card still fading out: its picture never left the screen, so the browser
    // will not report it loaded again. The fade starts here instead, on the element it now is.
    const clearUnder = () => setArt((a) => (a.under ? { ...a, under: null } : a));
    const clearBackdropUnder = () => setBackdrop((a) => (a.under ? { ...a, under: null } : a));
    const swapped = art.swapped ? art.shown?.scan : undefined;
    useEffect(() => {
        if (!swapped) return;
        landed("scan", scanFade, setScanLoaded, clearUnder)();
        // Only on the step: the handlers are rebuilt each render and carry nothing of their own.
    }, [swapped]);
    const backdropSwapped = backdrop.swapped ? backdrop.shown?.scan : undefined;
    useEffect(() => {
        if (!backdropSwapped) return;
        landed("blur", blurFade, setBlurLoaded, clearBackdropUnder)();
    }, [backdropSwapped]);

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
                                                onLoad={shown ? landed("blur", blurFade, setBlurLoaded, clearBackdropUnder) : undefined}
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
                                                        onLoad={shown ? landed("scan", scanFade, setScanLoaded, clearUnder) : undefined}
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
