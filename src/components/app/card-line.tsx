import type { ReactNode } from "react";
import { RaritySymbol, markOfCard } from "@/components/app/rarity-symbol";
import { cardLabel } from "@/lib/card-label";
import { cx } from "@/utils/cx";

type Lined = Parameters<typeof cardLabel>[0] & { rarity?: string | null; tcg_id?: string | null; tcgId?: string | null; language?: string | null };

/**
 * `cardLine` drawn: the printed label, then the rarity after a bullet with the mark the card prints
 * before its name, "PFL 004 · ★★ Double Rare". The string stays `cardLine` wherever a line is read
 * rather than seen (an accessible name, a search).
 *
 * `setId` is the catalogue's set, where the caller knows it better than the card's id says (a set
 * page); `after` runs on at the end of the same line ("· ×3").
 */
export function CardLine({ card, setId, after, className }: { card: Lined; setId?: string | null; after?: ReactNode; className?: string }) {
    const label = cardLabel(card);
    const rarity = card.rarity?.trim();
    return (
        <span className={cx("truncate text-xs text-tertiary", className)}>
            {label}
            {rarity ? (
                <>
                    {label ? " · " : null}
                    <RaritySymbol mark={markOfCard(card, setId)} className="mr-1" />
                    {rarity}
                </>
            ) : null}
            {after}
        </span>
    );
}
