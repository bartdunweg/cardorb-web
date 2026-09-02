"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowRight } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { markOwned } from "@/app/(app)/dashboard/cards/actions";
import { listCollections, setCardCollection } from "@/app/(app)/dashboard/collections/actions";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Card } from "@/lib/cards";
import { formatDate } from "@/lib/format";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-sm text-tertiary">{label}</dt>
            <dd className="text-right text-sm font-medium text-primary">{value ?? "—"}</dd>
        </div>
    );
}

export function CardDetailSlideout({ card, onClose, readOnly = false }: { card: Card | null; onClose: () => void; readOnly?: boolean }) {
    const router = useRouter();
    const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
    const [collectionId, setCollectionId] = useState<string>("");
    const [moving, setMoving] = useState(false);
    const [moveError, setMoveError] = useState<string | null>(null);

    useEffect(() => {
        if (!readOnly) listCollections().then(setCollections);
    }, [readOnly]);

    // Reset the editable collection value when a different card opens — done during render (React's
    // documented pattern for adjusting state on prop change) rather than in an effect.
    const [syncedCardId, setSyncedCardId] = useState(card?.id);
    if (card?.id !== syncedCardId) {
        setSyncedCardId(card?.id);
        setCollectionId(card?.collection_id ?? "");
    }

    const onCollectionChange = async (value: string) => {
        if (!card) return;
        setCollectionId(value);
        await setCardCollection(card.id, value || null);
        router.refresh();
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
        >
            {({ close }) => (
                <>
                    <SlideoutMenu.Header onClose={close}>
                        <h2 className="text-lg font-semibold text-primary">
                            {card?.is_favorite ? <span className="mr-1 text-tertiary">★</span> : null}
                            {card?.name}
                        </h2>
                        <p className="text-sm text-tertiary">{[card?.set_name, card?.number ? `#${card.number}` : null].filter(Boolean).join(" · ") || "—"}</p>
                    </SlideoutMenu.Header>

                    <SlideoutMenu.Content>
                        {card?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={card.image_url} alt={card.name} className="mx-auto w-48 rounded-xl" />
                        ) : (
                            <div className="mx-auto flex aspect-[63/88] w-48 flex-col items-center justify-center gap-1 rounded-xl bg-quaternary p-4 text-center">
                                <span className="text-sm font-medium text-secondary">{card?.name}</span>
                                {card?.number ? <span className="text-xs text-quaternary">#{card.number}</span> : null}
                            </div>
                        )}

                        {!readOnly &&
                            (card?.wishlist ? (
                                <div className="flex flex-col gap-1.5">
                                    <Button size="md" iconTrailing={ArrowRight} onClick={onMoveToCollection} isLoading={moving}>
                                        Move to collection
                                    </Button>
                                    {moveError ? <p className="text-sm text-error-primary">{moveError}</p> : null}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-secondary">Collection</span>
                                    <NativeSelect
                                        aria-label="Collection"
                                        value={collectionId}
                                        onChange={(event) => onCollectionChange(event.target.value)}
                                        options={[{ label: "None", value: "" }, ...collections.map((c) => ({ label: c.name, value: c.id }))]}
                                    />
                                </div>
                            ))}

                        <dl className="flex flex-col divide-y divide-secondary">
                            <DetailRow label="Rarity" value={card?.rarity} />
                            <DetailRow label="Generation" value={card?.gen} />
                            <DetailRow label="Types" value={card?.types?.length ? card.types.join(", ") : null} />
                            <DetailRow label="Quantity" value={card?.quantity ?? 1} />
                            <DetailRow label="Condition" value={card?.condition} />
                            <DetailRow label="Grade" value={card?.grade} />
                            <DetailRow label="Finish" value={card?.finish} />
                            {/* Personal fields stay off the public read-only view. */}
                            {!readOnly && <DetailRow label="Owned" value={card?.owned ? "Yes" : "No"} />}
                            {!readOnly && <DetailRow label="Purchase price" value={card?.purchase_price != null ? card.purchase_price : null} />}
                            {!readOnly && <DetailRow label="Purchase date" value={card?.purchase_date ? formatDate(card.purchase_date) : null} />}
                            {!readOnly && <DetailRow label="Acquired" value={card?.acquired_at ? formatDate(card.acquired_at) : null} />}
                        </dl>

                        {!readOnly && card?.notes ? (
                            <div className="flex flex-col gap-1 border-t border-secondary pt-4">
                                <p className="text-sm text-tertiary">Notes</p>
                                <p className="text-sm text-primary">{card.notes}</p>
                            </div>
                        ) : null}
                    </SlideoutMenu.Content>
                </>
            )}
        </SlideoutMenu>
    );
}
