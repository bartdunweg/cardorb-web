"use client";

import { FavoriteStar } from "@/components/app/favorite-star";
import type { Card } from "@/lib/cards";

// Presentational table. Selection (and the detail slideout) is owned by CardsView.
export function CardsTable({ cards, onSelect }: { cards: Card[]; onSelect: (card: Card) => void }) {
    return (
        <div className="overflow-x-auto rounded-xl ring-1 ring-secondary ring-inset">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary bg-secondary text-tertiary">
                    <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Set</th>
                        <th className="px-4 py-3 font-medium">Number</th>
                        <th className="px-4 py-3 font-medium">Rarity</th>
                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {cards.map((card) => (
                        <tr key={card.id} className="border-b border-secondary text-primary last:border-0 hover:bg-secondary">
                            <td className="px-4 py-3 font-medium">
                                <button
                                    type="button"
                                    onClick={() => onSelect(card)}
                                    className="flex cursor-pointer items-center gap-3 text-left outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2"
                                >
                                    {card.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={card.image_url} alt="" className="h-10 w-auto shrink-0 rounded" loading="lazy" />
                                    ) : (
                                        <div className="h-10 w-7 shrink-0 rounded bg-quaternary" />
                                    )}
                                    <span>
                                        {card.is_favorite ? <FavoriteStar /> : null}
                                        {card.name}
                                    </span>
                                </button>
                            </td>
                            <td className="px-4 py-3 text-tertiary">{card.set_name ?? "—"}</td>
                            <td className="px-4 py-3 text-tertiary">{card.number ?? "—"}</td>
                            <td className="px-4 py-3 text-tertiary">{card.rarity ?? "—"}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{card.quantity ?? 1}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
