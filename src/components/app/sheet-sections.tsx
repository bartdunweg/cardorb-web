"use client";

import type { ReactNode } from "react";
import { Plus } from "@untitledui/icons";
import Image from "next/image";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import type { BinderChoice } from "@/app/(app)/dashboard/collections/actions";
import { CardPriceChart } from "@/components/app/card-price-chart";
import type { PeriodKey } from "@/components/app/chart-periods";
import { CopyCard } from "@/components/app/copy-card";
import { CopyFormDialog } from "@/components/app/copy-form-dialog";
import { TypeIcon } from "@/components/app/type-icon";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { matchesRule } from "@/lib/binder-rule";
import { copyLine } from "@/lib/card-label";
import { isReverseFinish } from "@/lib/card-shapes";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { type CopyGroup, groupCopies } from "@/lib/copies";
import { tcgplayerUrl } from "@/lib/price-links";
import { listBinders } from "@/lib/reads";
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

type Props = {
    card: Card | PublicCard;
    mine: Card | null;
    readOnly: boolean;
    rowPending: boolean;
    known: CardFacts | null;
    formFacts: CardFacts | null | undefined;
    genLogo: string | null;
    shownSeries: string | null;
    period: PeriodKey;
    setPeriod: (period: PeriodKey) => void;
    /** What to do with a card you do not hold: drawn here from `sm` up, in the bar at the bottom on a phone. */
    offer: ReactNode;
    sm: boolean;
    emptied: boolean;
    busy: boolean;
    binders: BinderChoice[];
    setBinders: (binders: BinderChoice[]) => void;
    facets: Facets | undefined;
    binder: { id: string; name: string } | null;
    copies: Card[] | null;
    isStarred: boolean;
    fileInBinder: () => void;
    stepUp: (group: CopyGroup) => void;
    stepDown: (group: CopyGroup) => Promise<void>;
    dropCopies: (group: Card[]) => Promise<void>;
    scheduleRefresh: () => void;
    reloadCopies: () => Promise<void>;
};

/**
 * The card sheet's page under the header: price, details, your copies. One element, so the
 * print-run tabs can hold it in their panel, and a card with one run shows it without tabs.
 */
export function SheetSections({
    card,
    mine,
    readOnly,
    rowPending,
    known,
    formFacts,
    genLogo,
    shownSeries,
    period,
    setPeriod,
    offer,
    sm,
    emptied,
    busy,
    binders,
    setBinders,
    facets,
    binder,
    copies,
    isStarred,
    fileInBinder,
    stepUp,
    stepDown,
    dropCopies,
    scheduleRefresh,
    reloadCopies,
}: Props) {
    /* The binders any copy of this card is in: filed by hand, or fitting a rule binder's rule. */
    const heldRows = mine ? (copies ?? [mine]) : [];
    const inBinders = binders.filter((c) => heldRows.some((r) => (c.rule ? matchesRule(r, c.rule, facets) : r.collection_id === c.id)));

    return (
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
    );
}
