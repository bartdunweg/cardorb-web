import type { Card } from "@/lib/api-shapes";

/** One suggestion under a collection's search field: the title of a card you hold, and where it sits. */
export type CardTitle = { name: string; hint: string };

/** How many titles a field offers at once: enough to recognise yours, short enough to read in one look. */
export const TITLE_SUGGESTIONS = 7;

/**
 * The distinct titles in a batch of rows, in the order the API answered them.
 *
 * A title is what a person searches for ("Charizard", "Professor's Research"), and a collection
 * holds it several times over: three printings, two copies of one. So the rows are folded to
 * their names, and the hint says which of the two it is: the set, where the title is one row in
 * hand, and otherwise how many rows carry the name.
 */
export function distinctTitles(cards: Card[], limit = TITLE_SUGGESTIONS): CardTitle[] {
    const byName = new Map<string, Card[]>();
    for (const card of cards) {
        const rows = byName.get(card.name);
        if (rows) rows.push(card);
        else byName.set(card.name, [card]);
    }

    return [...byName.entries()].slice(0, limit).map(([name, rows]) => {
        const sets = new Set(rows.map((row) => row.set_name).filter((set): set is string => Boolean(set)));
        const [only] = [...sets];
        return { name, hint: sets.size === 1 && rows.length === 1 && only ? only : `${rows.length} card${rows.length === 1 ? "" : "s"}` };
    });
}
