"use client";

import { CardImage } from "@/components/app/card-image";
import { FavoriteStar } from "@/components/app/favorite-star";
import { Table, TableCard } from "@/components/application/table/table";
import type { Card } from "@/lib/cards";
import { formatPrice } from "@/lib/format";

// Presentational table on the kit's Table. A row is the action: press or Enter opens the card;
// selection (and the detail slideout) is owned by CardsView.
export function CardsTable({ cards, onSelect }: { cards: Card[]; onSelect: (card: Card, siblings: Card[]) => void }) {
    const byId = new Map(cards.map((card) => [card.id, card]));

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
                    <Table.Head id="name" label="Name" isRowHeader />
                    <Table.Head id="set" label="Set" />
                    <Table.Head id="number" label="Number" />
                    <Table.Head id="rarity" label="Rarity" />
                    <Table.Head id="price" label="Market price" className="text-right" />
                    <Table.Head id="quantity" label="Quantity" className="text-right" />
                </Table.Header>
                <Table.Body items={cards}>
                    {(card) => (
                        <Table.Row id={card.id} className="arrive cursor-pointer">
                            <Table.Cell className="font-medium text-primary">
                                <div className="flex items-center gap-3">
                                    {card.image_url ? (
                                        <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-quaternary ring-1 ring-image ring-inset">
                                            <CardImage src={card.image_url} alt="" width={64} className="object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-10 w-7 shrink-0 rounded bg-quaternary" />
                                    )}
                                    <span className="flex items-center gap-1">
                                        {card.name}
                                        {card.is_favorite ? <FavoriteStar /> : null}
                                    </span>
                                </div>
                            </Table.Cell>
                            <Table.Cell>{card.set_name ?? "—"}</Table.Cell>
                            <Table.Cell>{card.number ?? "—"}</Table.Cell>
                            <Table.Cell>{card.rarity ?? "—"}</Table.Cell>
                            <Table.Cell className="text-right font-medium text-primary tabular-nums">
                                {card.price != null ? formatPrice(card.price) : <span className="text-tertiary">—</span>}
                            </Table.Cell>
                            <Table.Cell className="text-right text-primary tabular-nums">{card.quantity ?? 1}</Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </TableCard.Root>
    );
}
