"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, DotsHorizontal, Minus, Phone01, Plus, Star01, Trash01, XClose } from "@untitledui/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import {
    type CardFacts,
    cardFacts,
    listCopies,
    removeCard,
    seriesLogo,
    setAcquiredAt,
    setCondition,
    setCopies,
    setFavorite,
    setLanguage,
} from "@/app/(app)/dashboard/cards/actions";
import { type FolderChoice, listCollections, loadFacets, setCardCollection } from "@/app/(app)/dashboard/collections/actions";
import { CardImage } from "@/components/app/card-image";
import { CardPriceChart } from "@/components/app/card-price-chart";
import { CONDITIONS } from "@/components/app/condition-badge";
import { CopyFormDialog } from "@/components/app/copy-form-dialog";
import { FlagIcon } from "@/components/app/flag-icon";
import { FolderDialog } from "@/components/app/folder-dialog";
import { HoloCard } from "@/components/app/holo-card";
import { LanguageSelect } from "@/components/app/language-select";
import { MarkOwnedDialog } from "@/components/app/mark-owned-dialog";
import { SheetBar } from "@/components/app/sheet-bar";
import { TypeIcon } from "@/components/app/type-icon";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { FINISH_LABELS, FOIL_PATTERN_LABELS, type Finish, type FoilPattern, isReverseFinish } from "@/lib/api-shapes";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { sortCopies } from "@/lib/copies";
import { matchesRule } from "@/lib/folder-rule";
import { formatDate, formatPrice } from "@/lib/format";
import { orientationNeedsPermission, requestOrientation } from "@/lib/holo/orientation";
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

type Props = ({ card: Card | null; onClose: () => void; readOnly?: false } | { card: PublicCard | null; onClose: () => void; readOnly: true }) & Neighbours;

export function CardDetailSlideout({ card, onClose, readOnly = false, onPrev, onNext }: Props) {
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
    const reloadCopies = async (row: Card | null = mine) => {
        if (!row || !row.owned) return;
        const rows = sortCopies(await listCopies(row));
        setCopiesState({ of: copiesKey(row), rows });
        // A row that is gone (removed, or merged away) cannot stay the one shown.
        setViewing((v) => (v && !rows.some((r) => r.id === v.row.id) ? null : v));
    };
    // A new copy as a row of its own, made like the row shown, pulled today; the sheet moves to
    // it so what differs can be set at once.
    /* One copy of several. The sheet stays open on whatever is left, so removing the row you were
       reading moves you to the first one rather than closing the card out from under you. */
    const dropCopy = async (row: Card) => {
        if (!mine || !card) return;
        setBusy(true);
        setMenuError(null);
        const res = await removeCard(row.id);
        setBusy(false);
        if (!res.ok) {
            setMenuError(res.error);
            return;
        }
        const rows = sortCopies(await listCopies(mine));
        setCopiesState({ of: copiesKey(mine), rows });
        if (row.id === mine.id && rows[0]) setViewing({ of: card.id, row: rows[0] });
        router.refresh();
    };
    const [collections, setCollections] = useState<FolderChoice[]>([]);
    const [facets, setFacets] = useState<Facets | undefined>(undefined);
    const [collectionId, setCollectionId] = useState<string>("");
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
        if (res.ok) router.refresh();
        else setStarred(!next);
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
            if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
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
    /* Copies, as the sheet shows them. Minus stops at one: whether you hold a card and how many
       of it you hold are two facts, and the counter had been quietly doing the first one's job —
       stepping to nought marked the card as leaving and removed it when the sheet closed. A copy
       goes with the bin on its own line; the card goes with Remove from collection. Kept with the
       row it was read for. */
    const [copyCount, setCopies_] = useState<{ id: string; n: number } | null>(null);
    const shownCopies = mine && copyCount?.id === mine.id ? copyCount.n : (mine?.quantity ?? 1);
    /* Every copy of this card, not just the row on screen: the tab says how many there are before
       anybody opens it. The listed rows once they are read, the shown row's own count until then. */
    const heldTotal = copies ? copies.reduce((n, r) => n + (r.quantity ?? 1), 0) : shownCopies;
    const step = async (n: number) => {
        if (!mine || n < 1) return;
        setCopies_({ id: mine.id, n });
        const res = await setCopies(mine.id, n);
        if (!res.ok) {
            setMenuError(res.error);
            setCopies_({ id: mine.id, n: mine.quantity ?? 1 });
        } else {
            router.refresh();
            void reloadCopies();
        }
    };
    // The language as the sheet shows it, kept with the row it was picked for; the page re-reads after.
    const [language, setLanguage_] = useState<{ id: string; code: string } | null>(null);
    const shownLanguage = mine && language?.id === mine.id ? language.code : (mine?.language ?? "en");
    const pickLanguage = async (code: string) => {
        if (!mine) return;
        setLanguage_({ id: mine.id, code });
        const res = await setLanguage(mine.id, code);
        if (!res.ok) {
            setMenuError(res.error);
            setLanguage_(null);
        } else router.refresh();
    };
    // The condition as the sheet shows it, kept with the row it was picked for.
    const [condition, setCondition_] = useState<{ id: string; value: string } | null>(null);
    const shownCondition = mine && condition?.id === mine.id ? condition.value : (mine?.condition ?? "");
    const pickCondition = async (value: string) => {
        if (!mine) return;
        setCondition_({ id: mine.id, value });
        const res = await setCondition(mine.id, value || null);
        if (!res.ok) {
            setMenuError(res.error);
            setCondition_(null);
        } else {
            router.refresh();
            void reloadCopies();
        }
    };
    const closeSheet = async () => {
        // The next card, or this one again, opens on its own row.
        setViewing(null);
        onClose();
    };
    const [menuError, setMenuError] = useState<string | null>(null);
    const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>, closes = false) => {
        setBusy(true);
        setMenuError(null);
        const res = await action();
        setBusy(false);
        if (!res.ok) {
            setMenuError(res.error);
            return;
        }
        if (closes) onClose();
        router.refresh();
        void reloadCopies();
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
        listCopies(opened).then((rows) => {
            if (live) setCopiesState({ of: copiesKey(opened), rows: sortCopies(rows) });
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
        setCollectionId(mine?.collection_id ?? "");
        setStarred(null);
    }

    const titleRef = useRef<HTMLHeadingElement>(null);
    const [collectionError, setCollectionError] = useState<string | null>(null);
    const manual = collections.filter((c) => !c.rule);
    const onCollectionChange = async (value: string) => {
        if (!card) return;
        const before = collectionId;
        setCollectionId(value);
        setCollectionError(null);
        const res = await setCardCollection(card.id, value || null);
        if (res.ok) {
            router.refresh();
        } else {
            // The select must not keep showing a folder the card never moved to.
            setCollectionId(before);
            setCollectionError(res.error);
        }
    };

    return (
        <SlideoutMenu
            isDismissable
            isOpen={!!card}
            onOpenChange={(open) => {
                if (!open) void closeSheet();
            }}
            // The whole screen on a phone but for the page sheet's inset (iOS leaves ten points under
            // the status bar, so the page behind still shows as a page): the sheet is the card's page,
            // on the page's own opaque ground rather than on glass, so the art's fade has one colour
            // to end on, the same in both themes.
            dialogClassName="scrollbar-hide gap-0 mt-auto h-[calc(100dvh-env(safe-area-inset-top)-0.625rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-0.625rem)] bg-page backdrop-blur-none sm:h-full sm:max-h-full"
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
                                                    <Dropdown.Item icon={Trash01} onAction={() => run(() => removeCard(mine.id), true)}>
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
                        <div className="relative w-full overflow-hidden rounded-t-2xl sm:rounded-none">
                            {card?.image_url ? (
                                <div aria-hidden="true" className="absolute inset-0 scale-125 opacity-60 blur-lg">
                                    <CardImage src={card.image_url} alt="" width={64} className="object-cover" />
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
                                            <Button
                                                color="tertiary"
                                                size="lg"
                                                iconLeading={ChevronLeft}
                                                aria-label="Previous card"
                                                className="pointer-events-auto glass text-primary ring-1 ring-glass ring-inset"
                                                onClick={() => onPrev()}
                                            />
                                        ) : (
                                            <span />
                                        )}
                                        {onNext ? (
                                            <Button
                                                color="tertiary"
                                                size="lg"
                                                iconLeading={ChevronRight}
                                                aria-label="Next card"
                                                className="pointer-events-auto glass text-primary ring-1 ring-glass ring-inset"
                                                onClick={() => onNext()}
                                            />
                                        ) : (
                                            <span />
                                        )}
                                    </div>
                                ) : null}
                                {card?.image_url ? (
                                    /* The card tilts and shines under the pointer (the copy's finish and the
                                       printing's rarity pick the foil); the header's padding is the room it tilts in. */
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
                                        className="mx-auto w-full max-w-44"
                                    >
                                        <CardImage
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
                                        />
                                    </HoloCard>
                                ) : (
                                    <div className="mx-auto flex aspect-card w-full max-w-44 flex-col items-center justify-center gap-1 rounded-card bg-quaternary p-4 text-center">
                                        <span className="text-sm font-medium text-secondary">{card?.name}</span>
                                        {card?.number ? <span className="text-xs text-quaternary">#{card.number}</span> : null}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col px-4 pt-4 md:px-6">
                            <AriaHeading ref={titleRef} slot="title" className="text-lg font-semibold text-primary">
                                {/* No star here. The bar above carries it as a button you can press;
                                    a second one under the title said the same thing and did nothing. */}
                                {card?.name}
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
                            {menuError ? (
                                <p role="alert" className="text-sm text-error-primary">
                                    {menuError}
                                </p>
                            ) : null}
                        </div>
                    </SlideoutMenu.Header>

                    {/* No scroll box of its own: the sheet is the page, and the whole of it scrolls, art and all. */}
                    <SlideoutMenu.Content className="h-auto w-full flex-none overflow-visible pt-6 pb-6">
                        {/* Two tabs: the card's details, and its price with its line. A public view has no price, so no tabs. */}
                        {/* The list before its panels, and only once there is a card: a panel without its tab is
                            what react-aria warns about, and the sheet is mounted closed on every list page. A public
                            view has Details alone; the list is drawn all the same, so the panel has its tab. */}
                        {card ? (
                            <Tabs className="flex flex-col gap-5">
                                <TabList aria-label="Card" type="underline" size="sm" className={mine ? undefined : "sr-only"}>
                                    <Tab id="details" label="Details" />
                                    {mine?.owned ? <Tab id="copies" label="Your copies" badge={heldTotal > 1 ? heldTotal : undefined} /> : null}
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
                                {mine?.owned ? (
                                    <TabPanel id="copies" className="flex flex-col gap-6">
                                        {/* The copies you hold of this card, one line per row: the language's flag, the finish,
                                    the condition or grade, the folder and the count. A tap shows that row and its fields;
                                    Add a copy at the foot makes a new row and shows it. */}
                                        {mine?.owned ? (
                                            <div className="flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary ring-inset">
                                                <ul className="flex flex-col divide-y divide-secondary" aria-label="Copies">
                                                    {(copies ?? [mine]).map((row, i) => {
                                                        const folderName = collections.find((c) => c.id === row.collection_id)?.name;
                                                        const current = row.id === mine.id;
                                                        return (
                                                            // The row the sheet opened on is already there; the other copies arrive.
                                                            <li
                                                                key={row.id}
                                                                className={cx("flex items-center gap-1", !current && "arrive")}
                                                                style={{ "--arrive-delay": `${Math.min(i, 8) * 20}ms` } as React.CSSProperties}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    aria-current={current ? "true" : undefined}
                                                                    onClick={() => card && setViewing({ of: card.id, row })}
                                                                    className={cx(
                                                                        "flex w-full items-center gap-2 py-2 text-left text-sm outline-focus-ring focus-visible:outline-2",
                                                                        current ? "text-primary" : "text-secondary hover:text-primary",
                                                                    )}
                                                                >
                                                                    <FlagIcon language={row.language} />
                                                                    <span className="min-w-0 flex-1 truncate">
                                                                        {[
                                                                            // The finish, then the foil's pattern where anything
                                                                            // recorded one: "Holo · Cosmos". Two facts about this
                                                                            // copy — what it is worth, and what it looks like.
                                                                            row.finish && row.finish !== "normal"
                                                                                ? (FINISH_LABELS[row.finish as Finish] ?? null)
                                                                                : null,
                                                                            row.foil_pattern
                                                                                ? (FOIL_PATTERN_LABELS[row.foil_pattern as FoilPattern] ?? null)
                                                                                : null,
                                                                            row.grade ?? row.condition,
                                                                            folderName,
                                                                        ]
                                                                            .filter(Boolean)
                                                                            .join(" · ") || "Copy"}
                                                                    </span>
                                                                    {/* The copy's own price: a reverse holo has the foil's, the rest the plain one. */}
                                                                    {row.price != null ? (
                                                                        <span className="text-tertiary tabular-nums">{formatPrice(row.price)}</span>
                                                                    ) : null}
                                                                    <span className="text-tertiary tabular-nums">×{row.quantity ?? 1}</span>
                                                                </button>
                                                                {/* Removing a copy is a thing you do to that copy, so it belongs on that copy's
                                                                    line — outside the button that shows it, because a button inside a button is
                                                                    not a thing a browser will render. */}
                                                                {!readOnly ? (
                                                                    <Button
                                                                        color="tertiary-destructive"
                                                                        size="sm"
                                                                        iconLeading={Trash01}
                                                                        aria-label={`Remove this copy${row.language && row.language !== "en" ? ` (${row.language})` : ""}`}
                                                                        isDisabled={busy}
                                                                        onClick={() => void dropCopy(row)}
                                                                    />
                                                                ) : null}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                                {/* This copy: everything that belongs to the row shown, not to the card. */}
                                                <dl className="flex flex-col divide-y divide-secondary">
                                                    {/* Copies, with a step either way for an owner: the number is the row's own, the
                                        buttons the same call the menu makes. */}
                                                    <DetailRow
                                                        label="Quantity"
                                                        value={
                                                            mine?.owned ? (
                                                                <span className="flex items-center gap-2">
                                                                    <Button
                                                                        color="secondary"
                                                                        size="sm"
                                                                        iconLeading={Minus}
                                                                        aria-label="One copy fewer"
                                                                        isDisabled={busy || shownCopies <= 1}
                                                                        onClick={() => step(shownCopies - 1)}
                                                                    />
                                                                    <span className="min-w-4 text-center tabular-nums">{shownCopies}</span>
                                                                    <Button
                                                                        color="secondary"
                                                                        size="sm"
                                                                        iconLeading={Plus}
                                                                        aria-label="One copy more"
                                                                        isDisabled={busy}
                                                                        onClick={() => step(shownCopies + 1)}
                                                                    />
                                                                </span>
                                                            ) : (
                                                                (card?.quantity ?? 1)
                                                            )
                                                        }
                                                    />
                                                    {/* The printing's language, with its flag; an owner picks it here, a reader sees it. Not
                                        recorded reads as English, which nearly every card is. */}
                                                    {mine ? (
                                                        <DetailRow
                                                            label="Language"
                                                            value={
                                                                <LanguageSelect
                                                                    value={shownLanguage}
                                                                    onChange={(code) => void pickLanguage(code)}
                                                                    printed={known?.languages}
                                                                    inside={false}
                                                                />
                                                            }
                                                        />
                                                    ) : null}
                                                    {/* A graded copy has a grade and no condition: the slab says which it is. Otherwise the
                                        condition is picked here, in Cardmarket's scale. */}
                                                    {mine && mine.grade ? (
                                                        <DetailRow label="Grade" value={mine.grade} />
                                                    ) : mine ? (
                                                        <DetailRow
                                                            label="Condition"
                                                            value={
                                                                <span className="flex items-center justify-end gap-2">
                                                                    <NativeSelect
                                                                        aria-label="Condition"
                                                                        size="sm"
                                                                        className="w-auto"
                                                                        value={shownCondition}
                                                                        onChange={(event) => void pickCondition(event.target.value)}
                                                                        options={[
                                                                            { label: "Not recorded", value: "" },
                                                                            ...CONDITIONS.map((c) => ({ label: c, value: c })),
                                                                        ]}
                                                                    />
                                                                </span>
                                                            }
                                                        />
                                                    ) : null}
                                                    <DetailRow label="Finish" value={mine?.finish ?? "Not recorded"} />
                                                    {/* Personal fields stay off the public read-only view. */}
                                                    {mine && (
                                                        <DetailRow
                                                            label="Acquired"
                                                            value={
                                                                mine.owned ? (
                                                                    /* The kit's Input, the way mark-owned-dialog already asks for this
                                                                       same date. It was a raw input styled by hand and read as a smaller
                                                                       control in a column of larger ones — the two places that ask for an
                                                                       acquired date now ask the same way. */
                                                                    <Input
                                                                        type="date"
                                                                        aria-label="Acquired"
                                                                        size="sm"
                                                                        className="w-auto"
                                                                        value={mine.acquired_at ? mine.acquired_at.slice(0, 10) : ""}
                                                                        max={new Date().toISOString().slice(0, 10)}
                                                                        onChange={(date) => {
                                                                            if (date) void run(() => setAcquiredAt(mine.id, date));
                                                                        }}
                                                                    />
                                                                ) : mine.acquired_at ? (
                                                                    formatDate(mine.acquired_at)
                                                                ) : null
                                                            }
                                                        />
                                                    )}
                                                    {/* The folder this copy is filed in. Only a folder filled by hand takes a card; a rule
                                        folder fills itself. With none yet, the way to file it is to make one. */}
                                                    <DetailRow
                                                        label="Folder"
                                                        value={
                                                            <span className="flex flex-col items-end gap-2">
                                                                {manual.length ? (
                                                                    <NativeSelect
                                                                        aria-label="Folder"
                                                                        size="sm"
                                                                        className="w-auto max-w-48"
                                                                        value={collectionId}
                                                                        onChange={(event) => onCollectionChange(event.target.value)}
                                                                        options={[
                                                                            { label: "None", value: "" },
                                                                            ...manual.map((c) => ({ label: c.name, value: c.id })),
                                                                        ]}
                                                                    />
                                                                ) : null}
                                                                <FolderDialog
                                                                    mode="create"
                                                                    onSaved={async (id) => {
                                                                        const next = await listCollections();
                                                                        setCollections(next);
                                                                        if (id && next.some((c) => c.id === id && !c.rule)) onCollectionChange(id);
                                                                    }}
                                                                >
                                                                    <Button size="sm" color="link-gray" iconLeading={Plus}>
                                                                        New folder
                                                                    </Button>
                                                                </FolderDialog>
                                                                {collectionError ? (
                                                                    <span role="alert" className="text-sm text-error-primary">
                                                                        {collectionError}
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        }
                                                    />
                                                </dl>
                                                {/* Where the card is: the folder it was filed in, every rule folder whose rule it fits, and
                            Favorites when starred. A wish is in none of them. */}
                                                {mine ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-sm font-medium text-secondary">In folders</span>
                                                        <ul className="flex flex-wrap gap-1.5" aria-label="In folders">
                                                            {[
                                                                ...(isStarred ? [{ id: "favorites", name: "Favorites" }] : []),
                                                                ...collections.filter((c) =>
                                                                    c.rule ? matchesRule(mine, c.rule, facets) : c.id === collectionId,
                                                                ),
                                                            ].map(({ id, name }) => (
                                                                <li key={id}>
                                                                    <Badge size="sm" color="gray" type="pill-color">
                                                                        {name}
                                                                    </Badge>
                                                                </li>
                                                            ))}
                                                            {!isStarred &&
                                                            !collections.some((c) => (c.rule ? matchesRule(mine, c.rule, facets) : c.id === collectionId)) ? (
                                                                <li className="text-sm text-quaternary">None yet</li>
                                                            ) : null}
                                                        </ul>
                                                    </div>
                                                ) : null}
                                                {/* One is different… stays inside the card, because it acts on the copy the card
                                                is showing: it moves some of this row's copies onto a row of their own. */}
                                                {shownCopies > 1 ? (
                                                    <div className="flex flex-wrap gap-2 border-t border-secondary pt-4">
                                                        <CopyFormDialog
                                                            mode="split"
                                                            languages={known?.languages}
                                                            facts={known}
                                                            from={{ ...mine, quantity: shownCopies }}
                                                            folders={collections}
                                                            onSaved={() => void reloadCopies()}
                                                        >
                                                            <Button size="sm" color="secondary">
                                                                One is different…
                                                            </Button>
                                                        </CopyFormDialog>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {/* Under the card, not in it. Adding a copy makes a new row beside the ones listed
                                            above — it is not something you do to the copy the card happens to be showing,
                                            and sitting in that card's foot said it was. Full width, because it is the one
                                            thing this tab is for once you have read the list. */}
                                        {mine?.owned ? (
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
                                            <DetailRow label="Market price" value={mine.price != null ? formatPrice(mine.price) : null} />
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
