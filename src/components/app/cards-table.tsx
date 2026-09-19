"use client";

import { useSyncExternalStore } from "react";
import { CardBack } from "@/components/app/card-back";
import { CardImage } from "@/components/app/card-image";
import { CardPrice } from "@/components/app/card-price";
import { FavoriteStar } from "@/components/app/favorite-star";
import { PriceMove, changeSince } from "@/components/app/price-change";
import { Table, TableCard } from "@/components/application/table/table";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { copyLine } from "@/lib/card-label";
import type { Card } from "@/lib/cards";

// Presentational table on the kit's Table. A row is the action: press or Enter opens the card;
// selection (and the detail slideout) is owned by CardsView.
const noSubscribe = () => () => {};

// The columns' own padding on a phone: 24 and 20 px a side left three columns 385 px wide in 343.
const TIGHT = "max-sm:px-3";

export function CardsTable({ cards, onSelect }: { cards: Card[]; onSelect: (card: Card, siblings: Card[]) => void }) {
    const byId = new Map(cards.map((card) => [card.id, card]));
    /* On a phone three columns less: six were about 550 px, so the table scrolled sideways and the price
       and quantity started off screen (bug hunt 2026-09-19). Left out of the table, not only hidden: a
       hidden cell stays in the grid's keyboard order, and ArrowRight stepped into three columns nobody
       could see. Until the page is hydrated they are hidden by CSS alone, so the server's table and the
       first render agree. */
    const sm = useBreakpoint("sm");
    const hydrated = useSyncExternalStore(
        noSubscribe,
        () => true,
        () => false,
    );
    const wide = !hydrated || sm;

    return (
        <TableCard.Root size="sm">
            <Table
                aria-label="Cards"
                onRowAction={(key) => {
                    const card = byId.get(String(key));
                    if (card) onSelect(card, cards);
                }}
            >
                <Table.Header>
                    <Table.Head id="name" label="Name" isRowHeader className={TIGHT} />
                    {wide ? <Table.Head id="set" label="Set" className="max-sm:hidden" /> : null}
                    {wide ? <Table.Head id="number" label="Number" className="max-sm:hidden" /> : null}
                    {wide ? <Table.Head id="rarity" label="Rarity" className="max-sm:hidden" /> : null}
                    <Table.Head id="price" label={wide ? "Market price" : "Price"} className={`text-right ${TIGHT}`} />
                    <Table.Head id="quantity" label="Quantity" className={`text-right ${TIGHT}`} />
                </Table.Header>
                <Table.Body items={cards}>
                    {(card) => (
                        <Table.Row id={card.id} className="arrive cursor-pointer">
                            <Table.Cell className={`font-medium text-primary ${TIGHT}`}>
                                <div className="flex items-center gap-3">
                                    {/* Face down where there is no picture, as the tiles are; the name beside it says which card. */}
                                    <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded ring-1 ring-image ring-inset">
                                        {card.image_url ? (
                                            <CardImage src={card.print_image_url ?? card.image_url} alt="" width={64} className="object-cover" />
                                        ) : (
                                            <CardBack width={64} />
                                        )}
                                    </div>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="flex items-center gap-1">
                                            {card.name}
                                            {card.is_favorite ? <FavoriteStar /> : null}
                                        </span>
                                        {/* The same second line the tiles have: which printing this copy is and what
                                            state it is in, "Holo · Near Mint" (copyLine). A row is one kind of copy,
                                            and two rows of one card read alike without it. Not a column of its own:
                                            the state belongs to the printing, and the table is already six columns
                                            wide on a laptop. A wish, which records neither, keeps the name alone. */}
                                        {copyLine(card) ? (
                                            <span className="truncate text-xs font-normal text-tertiary max-sm:whitespace-normal">{copyLine(card)}</span>
                                        ) : null}
                                        {/* The set and number the phone has no columns for, wrapped rather than cut: a line that
                                            cannot wrap sets the column's width in a table sized by its content. */}
                                        <span className="text-xs font-normal text-tertiary sm:hidden">
                                            {[card.set_name, card.printed_number ?? card.number].filter(Boolean).join(" · ")}
                                        </span>
                                    </span>
                                </div>
                            </Table.Cell>
                            {wide ? <Table.Cell className="max-sm:hidden">{card.set_name ?? "—"}</Table.Cell> : null}
                            {/* As the card prints it (001, SWSH179), as the grid's label reads; the row's own spelling where nothing matched. */}
                            {wide ? <Table.Cell className="max-sm:hidden">{card.printed_number ?? card.number ?? "—"}</Table.Cell> : null}
                            {wide ? <Table.Cell className="max-sm:hidden">{card.rarity ?? "—"}</Table.Cell> : null}
                            <Table.Cell className={`text-right font-medium text-primary tabular-nums ${TIGHT}`}>
                                {card.price != null || card.listing_price != null ? (
                                    <CardPrice price={card.price} listing={card.listing_price} />
                                ) : (
                                    <span className="text-tertiary">{"—"}</span>
                                )}
                                <PriceMove change={card.price_change} over={changeSince(card.price_change?.from)} className="block" />
                            </Table.Cell>
                            <Table.Cell className={`text-right text-primary tabular-nums ${TIGHT}`}>{card.quantity ?? 1}</Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </TableCard.Root>
    );
}
