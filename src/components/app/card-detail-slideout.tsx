"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, DotsHorizontal, Heart, Phone01, Plus, Star01, Trash01, XClose } from "@untitledui/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import {
    type CardFacts,
    addCard,
    cardFacts,
    listCopies,
    removeCard,
    restoreCard,
    seriesLogo,
    setCopies,
    setFavorite,
} from "@/app/(app)/dashboard/cards/actions";
import { type FolderChoice, listCollections, loadFacets } from "@/app/(app)/dashboard/collections/actions";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { CardPriceChart } from "@/components/app/card-price-chart";
import { CopyCard } from "@/components/app/copy-card";
import { CopyFormDialog } from "@/components/app/copy-form-dialog";
import { HoloCard } from "@/components/app/holo-card";
import { MarkOwnedDialog } from "@/components/app/mark-owned-dialog";
import { SheetBar } from "@/components/app/sheet-bar";
import { notify } from "@/components/app/toast";
import { TypeIcon } from "@/components/app/type-icon";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { type PokemonCard, type RemovedCard, isReverseFinish } from "@/lib/api-shapes";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { type CopyGroup, groupCopies, sortCopies } from "@/lib/copies";
import { matchesRule } from "@/lib/folder-rule";
import { formatDate, formatPrice } from "@/lib/format";
import { orientationNeedsPermission, requestOrientation } from "@/lib/holo/orientation";
import { settleLatest } from "@/lib/settle-latest";
import { cx } from "@/utils/cx";

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
 * The catalogue's answer for a printing, kept for as long as the page lives.
 *
 * These are facts about a card rather than about anybody's copy — an illustrator and an HP do
 * not change while somebody browses — so asking twice is a wait nobody needed. Held here rather
 * than in a provider because it is a memo, not state: nothing renders from it, and losing it on
 * a navigation costs one fetch.
 *
 * A null answer is kept too. A card the catalogue cannot place should not be asked about again
 * every time its sheet opens.
 */
const FACTS_SEEN = new Map<string, CardFacts | null>();

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
type Addable = { addable?: PokemonCard | null };

type Props = ({ card: Card | null; onClose: () => void; readOnly?: false } | { card: PublicCard | null; onClose: () => void; readOnly: true }) &
    Neighbours &
    Addable;

export function CardDetailSlideout({ card, onClose, readOnly = false, onPrev, onNext, addable }: Props) {
    const router = useRouter();
    // The owner's fields exist only on the editable view; the public view never receives them.
    // The row the sheet shows: the one it opened on, or another copy of the card tapped in the
    // Copies tile. Kept with the card it was chosen for, so a new card opens on its own row.
    const [viewing, setViewing] = useState<{ of: string; row: Card } | null>(null);
    const mine = readOnly ? null : viewing && card && viewing.of === card.id ? viewing.row : (card as Card | null);
    // Every row of this card the person holds, read when the sheet opens and after each write.
    const copiesKey = (c: Card) => `${c.set ?? ""}|${c.number ?? ""}|${c.name}`;
    const [copiesState, setCopiesState] = useState<{ of: string; rows: Card[] } | null>(null);
    const copies = mine && copiesState?.of === copiesKey(mine) ? copiesState.rows : null;
    /* Counts the presses the sheet has answered on screen before the store has. A read that
       started before one of those would put the old number back over the new one, so it is
       dropped; the press that made it stale reads again once its write has landed. */
    const pressed = useRef(0);
    const reloadCopies = async (row: Card | null = mine) => {
        if (!row || !row.owned) return;
        const asOf = pressed.current;
        const rows = sortCopies(await listCopies(row));
        if (asOf !== pressed.current) return;
        setCopiesState({ of: copiesKey(row), rows });
        // A row that is gone (removed, or merged away) cannot stay the one shown.
        setViewing((v) => (v && !rows.some((r) => r.id === v.row.id) ? null : v));
    };
    // A new copy as a row of its own, made like the row shown, pulled today; the sheet moves to
    // it so what differs can be set at once.
    /* One copy of several. The sheet stays open on whatever is left, so removing the row you were
       reading moves you to the first one rather than closing the card out from under you. */
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
           `for await` was four of those in a queue — the wait grew with the number of copies, on
           the one action where the number of copies is the whole point. They touch different rows,
           so nothing is racing. */
        const results = await Promise.all(group.map((row) => removeCard(row.id)));
        setBusy(false);
        const failed = results.find((r) => !r.ok);
        if (failed && !failed.ok) {
            notify.failed(group.length > 1 ? "Those copies were not removed" : "That copy was not removed", { description: failed.error });
            void reloadCopies();
            return;
        }
        offerUndo(
            results.flatMap((r) => (r.ok && r.card ? [r.card] : [])),
            group.length > 1 ? `${group.length} copies removed` : "Copy removed",
        );
        scheduleRefresh();
    };
    /* A card the sheet has just emptied stays on screen as a card you could take again, so the
       last minus is not a door slamming. The set page hands one of these in; everywhere else the
       card on screen is enough to build it. */
    const [removed, setRemoved] = useState<string | null>(null);
    const emptied = !!card && removed === card.id;
    /* Read-only sheets never take a card, so the public shape is not asked to answer for one. */
    const own = readOnly ? null : (card as Card | null);
    const takeable: PokemonCard | null =
        addable ??
        (own
            ? {
                  id: own.id,
                  name: own.name,
                  set: own.set ?? own.set_name ?? "",
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
              }
            : null);

    /* Taking a card the sheet was only showing. The list behind re-reads, and the sheet closes:
       what it was showing is not what it is now, and the row it became has its own copies. */
    const add = async (list: "collection" | "wishlist") => {
        if (!takeable) return;
        setBusy(true);
        const res = await addCard(takeable, list);
        setBusy(false);
        if (!res.ok) {
            notify.failed(list === "wishlist" ? "That card was not added to your wishlist" : "That card was not added to your collection", {
                description: res.error,
            });
            return;
        }
        setRemoved(null);
        router.refresh();
        onClose();
        notify.done(list === "wishlist" ? "Added to your wishlist" : "Added to your collection", { description: takeable.name });
    };
    const [collections, setCollections] = useState<FolderChoice[]>([]);
    const [facets, setFacets] = useState<Facets | undefined>(undefined);
    // The star, kept here so a tap answers at once; the page re-reads the flag after the save.
    const [starred, setStarred] = useState<boolean | null>(null);
    const [starring, setStarring] = useState(false);
    const isStarred = starred ?? mine?.is_favorite ?? false;
    const toggleStar = async () => {
        if (!mine) return;
        const next = !isStarred;
        setStarred(next);
        setStarring(true);
        const res = await setFavorite(mine.id, next);
        setStarring(false);
        if (res.ok) scheduleRefresh();
        else {
            setStarred(!next);
            notify.failed(next ? "That card is not a Favorite" : "That card is still a Favorite", { description: res.error });
        }
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
    // Seeded from FACTS_SEEN, which is why a card opened twice fills in at once rather than a
    // half-second later with its rows animating: measured, the sheet is on screen at 92 ms and
    // the catalogue answers at 559 ms, and the `arrive` on those rows spends that gap drawing
    // attention to it. The second time there is no gap to draw.
    const [facts, setFacts] = useState<{ tcgId: string; facts: CardFacts | null } | null>(null);
    const tcgId = card?.tcg_id ?? null;
    useEffect(() => {
        if (!tcgId || FACTS_SEEN.has(tcgId)) return;
        let live = true;
        cardFacts(tcgId).then((f) => {
            FACTS_SEEN.set(tcgId, f);
            if (live) setFacts({ tcgId, facts: f });
        });
        return () => {
            live = false;
        };
    }, [tcgId]);
    /*
     * Read from what was fetched, or from what a previous open already learned — derived rather
     * than copied into state, so a card whose answer is already known needs no effect and no
     * render to show it.
     *
     * That is the whole of it: measured, the sheet is on screen at 63 ms and the catalogue
     * answers at 739 ms, and the `arrive` on those rows spends the gap between drawing attention
     * to it. Opened a second time there is no gap, so nothing animates.
     */
    const known = tcgId ? (facts?.tcgId === tcgId ? facts.facts : (FACTS_SEEN.get(tcgId) ?? null)) : null;

    /*
     * The arrow keys, which is how anybody who is already looking at a list expects to move
     * through it. Only when nothing is being typed into: the sheet holds a note field and a
     * grade box, and a left arrow inside those belongs to the cursor.
     */
    useEffect(() => {
        if (!onPrev && !onNext) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const el = e.target as HTMLElement | null;
            /* Not only the fields: react-aria's tab list moves between tabs with the arrow keys,
               and the price chart's arrows are the only way to reach its individual figures — the
               whole of its text alternative. Both sat under this handler, so on the Price tab a
               right arrow threw you onto another card instead of reading the next price. */
            if (
                el?.closest(
                    "input, textarea, select, [contenteditable='true'], [role='tab'], [role='tablist'], [role='menu'], [role='menuitem'], [role='listbox'], [role='option'], [role='slider'], [tabindex]:not([tabindex='-1']) svg, figure",
                )
            )
                return;
            if (e.key === "ArrowLeft") onPrev?.();
            if (e.key === "ArrowRight") onNext?.();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onPrev, onNext]);
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
    // In the dots menu, where the card's other actions are — a bar button of its own spent one of
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
    const [settleQuantity] = useState(() => settleLatest(setCopies));
    const showQuantity = (row: Card, quantity: number) => {
        if (!mine) return;
        pressed.current += 1;
        const base = copies ?? [mine];
        setCopiesState({ of: copiesKey(mine), rows: base.map((r) => (r.id === row.id ? { ...r, quantity } : r)) });
        void settleQuantity(row.id, quantity, (error) => {
            notify.failed("The number of copies did not change", { description: error });
            void reloadCopies();
        }).then((landed) => {
            if (!landed) return;
            scheduleRefresh();
            void reloadCopies();
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
        const last = (copies ?? [spare]).length <= 1;
        await dropCopies([spare]);
        if (last && card) setRemoved(card.id);
    };
    /* Every copy of this card, not just the row on screen: the tab says how many there are before
       anybody opens it. The listed rows once they are read, the shown row's own count until then. */
    const heldTotal = copies ? copies.reduce((n, r) => n + (r.quantity ?? 1), 0) : (mine?.quantity ?? 1);

    const closeSheet = async () => {
        flushRefresh();
        // The next card, or this one again, opens on its own row.
        setViewing(null);
        onClose();
    };
    /* A way back that puts the row back whole. The rows live only in this closure, for as long as
       the toast is up: the API keeps nothing, so an undo nobody presses costs nothing and leaves
       nothing behind. An API that has not deployed the change yet hands back no row, and then
       there is nothing to offer — the removal stands and says so without an Undo, which is better
       than a button that would quietly create a card missing everything it held. */
    const offerUndo = (rows: RemovedCard[], done: string) => {
        if (!rows.length) return notify.done(done);
        notify.done(done, {
            undo: {
                label: "Put back",
                onUndo: () => {
                    void Promise.all(rows.map((row) => restoreCard(row))).then((results) => {
                        const failed = results.find((r) => !r.ok);
                        if (failed && !failed.ok) notify.failed("That did not go back", { description: failed.error });
                        else notify.done(rows.length > 1 ? `${rows.length} copies are back` : "It is back");
                        scheduleRefresh();
                        void reloadCopies();
                    });
                },
            },
        });
    };

    const removeAndOffer = async (id: string, wishlist: boolean) => {
        setBusy(true);
        const res = await removeCard(id);
        setBusy(false);
        if (!res.ok) {
            notify.failed(wishlist ? "That card is still on your wishlist" : "That card is still in your collection", { description: res.error });
            return;
        }
        onClose();
        router.refresh();
        offerUndo(res.card ? [res.card] : [], wishlist ? "Removed from your wishlist" : "Removed from your collection");
    };

    // The folders and the facets are for the sheet's own controls, so they are asked for when a
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
            if (live && asOf === pressed.current) setCopiesState({ of: copiesKey(opened), rows: sortCopies(rows) });
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
        listCollections().then(setCollections);
        loadFacets().then(setFacets);
    }, [readOnly, card]);

    // Reset the editable collection value when a different card opens — done during render (React's
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
     * its own picture is on screen — not on mount, or the fade would run on an empty box and the
     * picture still pop in after it. Opacity only, 200 ms on the enter curve: this runs on every
     * arrow press, so it has to stay under the threshold of noticing. Reduced motion keeps it,
     * being a fade and nothing else.
     *
     * The blurred copy underneath is never cleared: fully covered once the next one lands, it
     * costs one 64 px picture. The scan underneath goes as soon as the new one has faded in,
     * since a card tilted under the pointer would show it peeking out. Adjusted during render,
     * the same way as the collection value above.
     */
    const [art, setArt] = useState<{ id: string; scan: string; blur: string } | null>(null);
    const [prevArt, setPrevArt] = useState<{ scan: string; blur: string } | null>(null);
    const [scanLoaded, setScanLoaded] = useState(false);
    const [blurLoaded, setBlurLoaded] = useState(false);
    const scanFade = useRef<HTMLDivElement>(null);
    const blurFade = useRef<HTMLDivElement>(null);
    const fades = useRef<{ scan?: Animation; blur?: Animation }>({});
    if (card?.image_url ? art?.id !== card.id : art !== null) {
        setArt(card?.image_url ? { id: card.id, scan: card.image_high_url ?? card.image_url, blur: card.image_url } : null);
        // Underneath only what was there while the sheet stayed open: opening it anew has nothing to cross from.
        setPrevArt(card?.image_url && art ? { scan: art.scan, blur: art.blur } : null);
        setScanLoaded(false);
        setBlurLoaded(false);
    }
    /*
     * The fade is a Web Animation started the moment the picture reports in, not a class the
     * layer transitions to. A cached picture reports in the same task that made its layer
     * transparent, and a class flipped back within that task is never seen by the browser: it
     * styles the end state once and nothing crosses. An animation started then plays from zero
     * whatever the base style does underneath it. Both pictures are keyed by the card, so each is
     * a fresh <img>: on a reused one Chrome still calls the old request complete for a tick after
     * the address changes, and next/image took that for the new picture being there.
     */
    const landed = (which: "scan" | "blur", layer: React.RefObject<HTMLDivElement | null>, set: (v: boolean) => void, done?: () => void) => () => {
        set(true);
        fades.current[which]?.cancel();
        const el = layer.current;
        if (!el) return;
        const easing = getComputedStyle(el).getPropertyValue("--ease-enter").trim() || "ease-out";
        const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing });
        fades.current[which] = fade;
        if (done) fade.onfinish = done;
    };
    // Stepping on before the last fade finished: its finish would have cleared the scan the
    // next card now needs underneath, so it is cancelled with the card it belonged to.
    useEffect(() => {
        const running = fades.current;
        return () => {
            running.scan?.cancel();
            running.blur?.cancel();
        };
    }, [art?.id]);

    const titleRef = useRef<HTMLHeadingElement>(null);
    /* The binders any copy of this card is in: filed by hand, or fitting a rule binder's rule. */
    const heldRows = mine ? (copies ?? [mine]) : [];
    const inBinders = collections.filter((c) => heldRows.some((r) => (c.rule ? matchesRule(r, c.rule, facets) : r.collection_id === c.id)));

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
            dialogClassName="scrollbar-hide gap-0 h-dvh max-h-dvh rounded-none bg-page backdrop-blur-none sm:h-full sm:max-h-full"
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
                                {mine ? (
                                    <>
                                        {mine.owned ? (
                                            <Tooltip title={isStarred ? "Remove from Favorites" : "Add to Favorites"}>
                                                <Button
                                                    color={isStarred ? "primary" : "tertiary"}
                                                    size="lg"
                                                    iconLeading={Star01}
                                                    aria-label="Favorite"
                                                    aria-pressed={isStarred}
                                                    isLoading={starring}
                                                    onClick={toggleStar}
                                                    className={isStarred ? undefined : "glass text-primary ring-1 ring-glass ring-inset"}
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
                                                    {/* Copies are counted in the Copies tab, with the rest of what a copy is.
                                                        Adding and removing one here as well was a second place for the same
                                                        number, and the one that showed no other copy while it did it.

                                                        "Hide from public page" is gone because it hid nothing: `forPublic()`
                                                        strips the flag rather than filtering on it, and the only reader left
                                                        was the latest-pull block, which the profile no longer shows. What
                                                        does keep cards off a public profile is a folder's own switch. */}
                                                    <Dropdown.Item icon={Trash01} onAction={() => void removeAndOffer(mine.id, !!mine.wishlist)}>
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
                        <div className="relative w-full overflow-hidden">
                            {card?.image_url ? (
                                /* The dimming sits on the box, not the layers, so the new copy at full
                                   opacity covers the old one entirely rather than mixing with it. */
                                <div aria-hidden="true" className="absolute inset-0 opacity-60">
                                    {prevArt ? (
                                        <div className="absolute inset-0 scale-125 blur-lg">
                                            <CardImage src={prevArt.blur} alt="" width={64} className="object-cover" />
                                        </div>
                                    ) : null}
                                    <div ref={blurFade} className={cx("absolute inset-0 scale-125 blur-lg", blurLoaded ? "opacity-100" : "opacity-0")}>
                                        <CardImage
                                            key={card.id}
                                            src={card.image_url}
                                            alt=""
                                            width={64}
                                            className="object-cover"
                                            // Eager: the header's colour at the moment the sheet opens, and lazy
                                            // it waited for a scroll that never comes inside the sheet.
                                            priority
                                            onLoad={landed("blur", blurFade, setBlurLoaded)}
                                        />
                                    </div>
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
                                                    onClick={() => onPrev()}
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
                                                    onClick={() => onNext()}
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
                                        {prevArt ? (
                                            <div aria-hidden="true" className="absolute inset-0 aspect-card overflow-hidden rounded-card">
                                                <CardImage src={prevArt.scan} alt="" width={176} quality={75} className="object-cover" />
                                            </div>
                                        ) : null}
                                        <div ref={scanFade} className={scanLoaded ? "opacity-100" : "opacity-0"}>
                                            <HoloCard
                                                rarity={card.rarity}
                                                finish={mine?.finish ?? card.finish ?? null}
                                                // A public profile is not told what somebody's copy looks
                                                // like, so there is nothing to narrow to there.
                                                foilPattern={mine?.foil_pattern ?? ("foil_pattern" in card ? card.foil_pattern : null)}
                                                facts={known}
                                                number={card.number}
                                                types={card.types}
                                                gen={card.gen}
                                                tilt={tiltGranted}
                                                className="w-full"
                                            >
                                                <CardImage
                                                    key={card.id}
                                                    src={card.image_high_url ?? card.image_url}
                                                    fallbackSrc={card.image_url}
                                                    alt={card.name}
                                                    // The box is max-w-44, so 176 CSS pixels: 384 asked for the 828 rung and
                                                    // got a 50 KB file where 24 KB shows every pixel — eagerly, on every tap,
                                                    // because this one is priority. `width` is what the layout draws, not the
                                                    // scan you want.
                                                    width={176}
                                                    quality={75}
                                                    className="object-cover"
                                                    priority
                                                    onLoad={landed("scan", scanFade, setScanLoaded, () => setPrevArt(null))}
                                                />
                                            </HoloCard>
                                        </div>
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
                                {card ? [card.name, card.set_name, card.number ? `#${card.number}` : null].filter(Boolean).join(", ") : ""}
                            </output>
                            <AriaHeading ref={titleRef} slot="title" className="text-lg font-semibold text-primary">
                                {/* No star here. The bar above carries it as a button you can press;
                                    a second one under the title said the same thing and did nothing. */}
                                {/* The printed name in brackets after the English one, for a card off the
                                    Japanese, Korean or Chinese shelves: the app is English throughout, and
                                    this is the one place what the card says is worth a look. */}
                                {card ? ("local_name" in card && card.local_name ? `${card.name} (${card.local_name})` : card.name) : null}
                            </AriaHeading>
                            <p className="text-sm text-tertiary">
                                {[card?.set_name, card?.number ? `#${card.number}` : null].filter(Boolean).join(" · ") || "—"}
                            </p>
                            {/* The price sits under the title, where a product panel puts it, not among the attributes. */}
                            {mine?.price != null ? (
                                <p className="text-md font-semibold text-primary tabular-nums">
                                    {formatPrice(mine.price)}
                                    <span className="sr-only"> market price</span>
                                </p>
                            ) : null}
                            {/* A wish becomes a copy here, above the tabs: the one thing to do with a card you do not
                                hold yet. The form asks what the copy is like as it arrives. */}
                            {!readOnly && mine?.wishlist ? (
                                <MarkOwnedDialog card={mine} folders={collections} languages={known?.languages} facts={known} onSaved={onClose}>
                                    <Button size="md" iconTrailing={ArrowRight} className="mt-3 w-full">
                                        Mark as owned
                                    </Button>
                                </MarkOwnedDialog>
                            ) : null}
                        </div>
                    </SlideoutMenu.Header>

                    {/* No scroll box of its own: the sheet is the page, and the whole of it scrolls, art and all. */}
                    {/* role="presentation": the kit defaults this to `main`, and the page already has
                        one. Two unlabelled main landmarks is worse than none, and a dialog needs no
                        landmark inside it — react-aria names the dialog from its own heading. */}
                    {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                    <SlideoutMenu.Content role="presentation" className="h-auto w-full flex-none overflow-visible pt-6 pb-6">
                        {/* Two tabs: the card's details, and its price with its line. A public view has no price, so no tabs. */}
                        {/* The list before its panels, and only once there is a card: a panel without its tab is
                            what react-aria warns about, and the sheet is mounted closed on every list page. A public
                            view has Details alone; the list is drawn all the same, so the panel has its tab. */}
                        {/* On a card you hold, what you hold comes first: you opened it to see your own copies,
                            and the catalogue's facts about the printing answer a different question. A card you do
                            not hold has no such tab, and then Details is the front of the sheet as before. */}
                        {card ? (
                            <Tabs className="flex flex-col gap-5" defaultSelectedKey={mine ? "copies" : "details"}>
                                {/* `hidden`, not `sr-only`: on a card you do not hold there is one tab and
                                    nothing to choose, and sr-only leaves it in the tab order — a keyboard
                                    user landed on a tab that was not on the screen. */}
                                <TabList aria-label="Card" type="underline" size="sm" className={mine ? undefined : "hidden"}>
                                    {mine ? <Tab id="copies" label="Your copies" badge={mine.owned && heldTotal > 1 ? heldTotal : undefined} /> : null}
                                    <Tab id="details" label="Details" />
                                    {mine ? <Tab id="price" label="Price" /> : null}
                                </TabList>
                                <TabPanel id="details" className="flex flex-col gap-6">
                                    <dl className="flex flex-col divide-y divide-secondary">
                                        <DetailRow label="Rarity" value={card?.rarity} />
                                        {/* From the catalogue, once it answers: who drew it, and the card's own facts. */}
                                        {known?.illustrator ? <DetailRow label="Illustrator" value={known.illustrator} late /> : null}
                                        {known?.hp != null ? <DetailRow label="HP" value={known.hp} late /> : null}
                                        {known?.stage ? (
                                            <DetailRow
                                                label="Stage"
                                                value={known.evolveFrom ? `${known.stage} · from ${known.evolveFrom}` : known.stage}
                                                late
                                            />
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
                                                                <Image
                                                                    src={genLogo}
                                                                    alt=""
                                                                    width={96}
                                                                    height={24}
                                                                    className="h-6 w-auto max-w-28 object-contain"
                                                                />
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
                                        {readOnly ? <DetailRow label="Finish" value={card?.finish} /> : null}
                                    </dl>

                                    {mine?.notes ? (
                                        <div className="flex flex-col gap-1 border-t border-secondary pt-4">
                                            <p className="text-sm text-tertiary">Notes</p>
                                            <p className="text-sm text-primary">{mine.notes}</p>
                                        </div>
                                    ) : null}
                                </TabPanel>
                                {mine ? (
                                    <TabPanel id="copies" className="flex flex-col gap-6">
                                        {/* None yet, and the two ways to change that. This tab answers "what do I
                                            have of this", and for a card you do not hold the honest answer is
                                            nothing — followed by the offer, which is what you opened it for. */}
                                        {takeable && (emptied || (!mine.owned && !mine.wishlist)) ? (
                                            /* No card around it. A card in this app holds what you have of
                                               something, and this is the panel saying you have none — a box
                                               drawn around that reads as a copy with nothing in it. */
                                            <div className="flex flex-col gap-3">
                                                <p className="text-sm text-tertiary">
                                                    {emptied ? "That was the last copy; it has left your collection." : "You do not hold this card yet."}
                                                </p>
                                                {/* Under each other, each the width of the panel: two side by side made a choice out of
                                                    what is really two offers, and the narrower one read as the lesser. */}
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        size="md"
                                                        iconLeading={Plus}
                                                        className="w-full"
                                                        isDisabled={busy}
                                                        onClick={() => void add("collection")}
                                                    >
                                                        Add to collection
                                                    </Button>
                                                    <Button
                                                        size="md"
                                                        color="secondary"
                                                        iconLeading={Heart}
                                                        className="w-full"
                                                        isDisabled={busy}
                                                        onClick={() => void add("wishlist")}
                                                    >
                                                        Add to wishlist
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : null}
                                        {/* One card per kind of copy you hold — Holo · Near Mint, ×4 — with every field the
                                            add form asks, in its order and shape. Rows are one per purchase and nothing
                                            merged them, so four identical copies are one card saying ×4, and a change to
                                            it is made to all four. The card the sheet opened on is there at once; the
                                            other kinds arrive. */}
                                        {mine?.owned && !emptied
                                            ? groupCopies(copies ?? [mine]).map((group, i) => (
                                                  /* Keyed on the row, not the kind: the kind's key holds the condition and
                                                     the finish, so changing one of those in the card made it a new card to
                                                     React, and the select you had just used lost its focus. The row stays
                                                     the same row through a re-read. */
                                                  <div key={group.shown.id} style={{ "--arrive-delay": `${Math.min(i, 8) * 20}ms` } as React.CSSProperties}>
                                                      <CopyCard
                                                          group={group}
                                                          folders={collections}
                                                          languages={known?.languages}
                                                          facts={known}
                                                          busy={busy}
                                                          arrive={!group.rows.some((r) => r.id === mine.id)}
                                                          onMore={() => void stepUp(group)}
                                                          onFewer={() => void stepDown(group)}
                                                          onRemove={() => void dropCopies(group.rows)}
                                                          onSaved={() => {
                                                              scheduleRefresh();
                                                              void reloadCopies();
                                                          }}
                                                          refreshFolders={async () => {
                                                              const next = await listCollections();
                                                              setCollections(next);
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
                                            above — it is not something you do to the copy the card happens to be showing,
                                            and sitting in that card's foot said it was. Full width, because it is the one
                                            thing this tab is for once you have read the list. */}
                                        {mine?.owned && !emptied ? (
                                            <CopyFormDialog
                                                mode="add"
                                                languages={known?.languages}
                                                facts={known}
                                                from={mine}
                                                folders={collections}
                                                onSaved={() => void reloadCopies()}
                                            >
                                                <Button size="md" color="secondary" iconLeading={Plus} className="w-full">
                                                    Add a copy
                                                </Button>
                                            </CopyFormDialog>
                                        ) : null}
                                    </TabPanel>
                                ) : null}
                                {mine ? (
                                    <TabPanel id="price" className="flex flex-col gap-6">
                                        {/* The line first, then the numbers around it: what one copy trades at, what all the
                                        copies come to, what was paid, and what that bought. */}
                                        {mine.tcg_id ? <CardPriceChart tcgId={mine.tcg_id} holo={isReverseFinish(mine.finish)} name={card?.name} /> : null}
                                        <dl className="flex flex-col divide-y divide-secondary">
                                            {/* Near Mint, not market: the figure is the market price put through a measured band —
                                                above €20 about a quarter higher, between €5 and €20 about an eighth lower,
                                                and unchanged below that. A trend price is dragged down by played copies;
                                                this is an estimate of what a Near Mint one does. The old label named the
                                                input rather than the answer. */}
                                            <DetailRow label="Near Mint price" value={mine.price != null ? formatPrice(mine.price) : null} />
                                            {/* What the catalogue says about the printing, once it answers: where today's
                                                figure sits against the week and the month, and the band a copy is listed in. */}
                                            {known?.market?.trend != null ? <DetailRow label="Trend" value={formatPrice(known.market.trend)} late /> : null}
                                            {known?.market?.avg7 != null ? (
                                                <DetailRow label="7-day average" value={formatPrice(known.market.avg7)} late />
                                            ) : null}
                                            {known?.price?.avg30 != null ? (
                                                <DetailRow label="30-day average" value={formatPrice(known.price.avg30)} late />
                                            ) : null}
                                            {known?.price?.nm ? (
                                                <DetailRow
                                                    label="Near Mint range"
                                                    value={`${formatPrice(known.price.nm.low)} – ${formatPrice(known.price.nm.high)}`}
                                                    late
                                                />
                                            ) : known?.price?.low != null ? (
                                                <DetailRow label="Lowest listing" value={formatPrice(known.price.low)} late />
                                            ) : null}
                                            <DetailRow label="Copies" value={mine.quantity ?? 1} />
                                            <DetailRow
                                                label="Holding value"
                                                value={mine.price != null ? formatPrice(mine.price * (mine.quantity ?? 1)) : null}
                                            />
                                            <DetailRow label="Purchase price" value={mine.purchase_price != null ? formatPrice(mine.purchase_price) : null} />
                                            {mine.purchase_price != null && mine.price != null ? (
                                                <DetailRow
                                                    label="Since purchase"
                                                    value={
                                                        <span className={mine.price - mine.purchase_price >= 0 ? "text-success-primary" : "text-error-primary"}>
                                                            {mine.price - mine.purchase_price >= 0 ? "+" : "−"}
                                                            {formatPrice(Math.abs(mine.price - mine.purchase_price))}
                                                        </span>
                                                    }
                                                />
                                            ) : null}
                                            <DetailRow label="Purchase date" value={mine.purchase_date ? formatDate(mine.purchase_date) : null} />
                                        </dl>
                                    </TabPanel>
                                ) : null}
                            </Tabs>
                        ) : null}
                    </SlideoutMenu.Content>
                </>
            )}
        </SlideoutMenu>
    );
}
