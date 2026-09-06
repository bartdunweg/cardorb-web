"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, Star01, XClose } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { markOwned, setFavorite } from "@/app/(app)/dashboard/cards/actions";
import { type FolderChoice, listCollections, loadFacets, setCardCollection } from "@/app/(app)/dashboard/collections/actions";
import { CardImage } from "@/components/app/card-image";
import { FavoriteStar } from "@/components/app/favorite-star";
import { FolderDialog } from "@/components/app/folder-dialog";
import { PriceHistory } from "@/components/app/price-history";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { matchesRule } from "@/lib/folder-rule";
import { formatDate, formatPrice } from "@/lib/format";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-sm text-tertiary">{label}</dt>
            <dd className="text-right text-sm font-medium text-primary">{value ?? "—"}</dd>
        </div>
    );
}

type Props = { card: Card | null; onClose: () => void; readOnly?: false } | { card: PublicCard | null; onClose: () => void; readOnly: true };

export function CardDetailSlideout({ card, onClose, readOnly = false }: Props) {
    const router = useRouter();
    // The owner's fields exist only on the editable view; the public view never receives them.
    const mine = readOnly ? null : (card as Card | null);
    const [collections, setCollections] = useState<FolderChoice[]>([]);
    const [facets, setFacets] = useState<Facets | undefined>(undefined);
    const [collectionId, setCollectionId] = useState<string>("");
    const [moving, setMoving] = useState(false);
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
    const [moveError, setMoveError] = useState<string | null>(null);

    // The folders and the facets are for the sheet's own controls, so they are asked for when a
    // card first opens, not when the page mounts: this sits on every list page, closed, and used
    // to cost two calls on every visit for a sheet nobody had opened.
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

    const onMoveToCollection = async () => {
        if (!card) return;
        setMoving(true);
        setMoveError(null);
        const res = await markOwned(card.id);
        setMoving(false);
        if (res.ok) {
            onClose();
            router.refresh();
        } else {
            setMoveError(res.error);
        }
    };

    return (
        <SlideoutMenu
            isDismissable
            isOpen={!!card}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            // The whole screen on a phone: the sheet is the card's page, not a panel over one.
            dialogClassName="h-dvh max-h-dvh sm:h-full"
        >
            {({ close }) => (
                <>
                    <SlideoutMenu.Header onClose={close} close="none" className="px-0 pt-0">
                        {/* The card first, on a blurred, dimmed copy of itself: the art sets the header's colour,
                            the way a product page takes its hero's. The copy is decoration and says nothing. */}
                        <div className="relative w-full overflow-hidden">
                            {card?.image_url ? (
                                <div aria-hidden="true" className="absolute inset-0 scale-150 opacity-60 blur-2xl">
                                    <CardImage src={card.image_url} alt="" width={64} className="object-cover" />
                                </div>
                            ) : null}
                            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 fade-to-glass-thick" />
                            {/* Close at the left, the star at the right, on one line over the art: the two things a
                                person does to a card's page without reading it. */}
                            <Button color="secondary" size="sm" iconLeading={XClose} aria-label="Close" className="absolute top-3 left-3" onClick={close} />
                            {mine?.owned ? (
                                <Button
                                    color={isStarred ? "primary" : "secondary"}
                                    size="sm"
                                    iconLeading={Star01}
                                    aria-label="Favorite"
                                    aria-pressed={isStarred}
                                    isLoading={starring}
                                    onClick={toggleStar}
                                    className="absolute top-3 right-3"
                                />
                            ) : null}
                            <div className="relative px-10 pt-10 pb-6">
                                {card?.image_url ? (
                                    <div className="relative mx-auto aspect-card w-full max-w-44 overflow-hidden rounded-xl shadow-lift-lg">
                                        <CardImage
                                            src={card.image_high_url ?? card.image_url}
                                            alt={card.name}
                                            width={384}
                                            quality={75}
                                            className="object-contain"
                                            priority
                                        />
                                    </div>
                                ) : (
                                    <div className="mx-auto flex aspect-card w-full max-w-44 flex-col items-center justify-center gap-1 rounded-xl bg-quaternary p-4 text-center">
                                        <span className="text-sm font-medium text-secondary">{card?.name}</span>
                                        {card?.number ? <span className="text-xs text-quaternary">#{card.number}</span> : null}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col px-4 pt-4 md:px-6">
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                {card?.name}
                                {isStarred && mine ? <FavoriteStar /> : null}
                            </AriaHeading>
                            <p className="text-sm text-tertiary">
                                {[card?.set_name, card?.number ? `#${card.number}` : null].filter(Boolean).join(" · ") || "—"}
                            </p>
                            {/* The price sits under the title, where a product panel puts it, not among the attributes. */}
                            {mine?.price != null ? (
                                <p className="text-md font-semibold text-primary tabular-nums">
                                    {formatPrice(mine.price)} <span className="text-sm font-normal text-tertiary">market price</span>
                                </p>
                            ) : null}
                            {/* How that price has moved: the nightly readings, under the number they explain. */}
                            {mine?.tcg_id ? <PriceHistory tcgId={mine.tcg_id} holo={mine.finish === "reverse-holo"} /> : null}
                        </div>
                    </SlideoutMenu.Header>

                    <SlideoutMenu.Content>
                        {!readOnly &&
                            (mine?.wishlist ? (
                                <div className="flex flex-col gap-1.5">
                                    <Button size="md" iconTrailing={ArrowRight} onClick={onMoveToCollection} isLoading={moving}>
                                        Mark as owned
                                    </Button>
                                    {moveError ? (
                                        <p role="alert" className="text-sm text-error-primary">
                                            {moveError}
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-secondary">Folder</span>
                                    {/* Only a folder filled by hand takes a card; a rule folder fills itself. With none yet, the
                                        way to file this card is to make one, and the card goes straight into it. */}
                                    {manual.length ? (
                                        <NativeSelect
                                            aria-label="Folder"
                                            value={collectionId}
                                            onChange={(event) => onCollectionChange(event.target.value)}
                                            options={[{ label: "None", value: "" }, ...manual.map((c) => ({ label: c.name, value: c.id }))]}
                                        />
                                    ) : (
                                        <p className="text-sm text-tertiary">No folder filled by hand yet. A rule folder fills itself.</p>
                                    )}
                                    <FolderDialog
                                        mode="create"
                                        onSaved={async (id) => {
                                            const next = await listCollections();
                                            setCollections(next);
                                            if (id && next.some((c) => c.id === id && !c.rule)) onCollectionChange(id);
                                        }}
                                    >
                                        <Button size="sm" color="secondary" iconLeading={Plus} className="self-start">
                                            New folder
                                        </Button>
                                    </FolderDialog>
                                    {collectionError ? (
                                        <p role="alert" className="text-sm text-error-primary">
                                            {collectionError}
                                        </p>
                                    ) : null}
                                </div>
                            ))}

                        {/* Where the card is: the folder it was filed in, every rule folder whose rule it fits, and
                            Favorites when starred. A wish is in none of them. */}
                        {mine ? (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-secondary">In folders</span>
                                <ul className="flex flex-wrap gap-1.5" aria-label="In folders">
                                    {[
                                        ...(isStarred ? [{ id: "favorites", name: "Favorites" }] : []),
                                        ...collections.filter((c) => (c.rule ? matchesRule(mine, c.rule, facets) : c.id === collectionId)),
                                    ].map(({ id, name }) => (
                                        <li key={id}>
                                            <Badge size="sm" color="gray" type="pill-color">
                                                {name}
                                            </Badge>
                                        </li>
                                    ))}
                                    {!isStarred && !collections.some((c) => (c.rule ? matchesRule(mine, c.rule, facets) : c.id === collectionId)) ? (
                                        <li className="text-sm text-quaternary">None yet</li>
                                    ) : null}
                                </ul>
                            </div>
                        ) : null}

                        <dl className="flex flex-col divide-y divide-secondary">
                            <DetailRow label="Rarity" value={card?.rarity} />
                            <DetailRow label="Generation" value={card?.gen} />
                            <DetailRow label="Types" value={card?.types?.length ? card.types.join(", ") : null} />
                            <DetailRow label="Quantity" value={card?.quantity ?? 1} />
                            {mine && <DetailRow label="Condition" value={mine.condition} />}
                            {mine && <DetailRow label="Grade" value={mine.grade} />}
                            <DetailRow label="Finish" value={card?.finish} />
                            {/* Personal fields stay off the public read-only view. */}
                            {mine && <DetailRow label="Owned" value={mine.owned ? "Yes" : "No"} />}
                            {mine && <DetailRow label="Purchase price" value={mine.purchase_price != null ? formatPrice(mine.purchase_price) : null} />}
                            {mine && <DetailRow label="Purchase date" value={mine.purchase_date ? formatDate(mine.purchase_date) : null} />}
                            {mine && <DetailRow label="Acquired" value={mine.acquired_at ? formatDate(mine.acquired_at) : null} />}
                        </dl>

                        {mine?.notes ? (
                            <div className="flex flex-col gap-1 border-t border-secondary pt-4">
                                <p className="text-sm text-tertiary">Notes</p>
                                <p className="text-sm text-primary">{mine.notes}</p>
                            </div>
                        ) : null}
                    </SlideoutMenu.Content>
                </>
            )}
        </SlideoutMenu>
    );
}
