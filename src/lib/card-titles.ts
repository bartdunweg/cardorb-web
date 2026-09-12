import type { Card } from "@/lib/api-shapes";
import { band, rank } from "@/lib/name-rank";

/** One suggestion under a collection's search field: the title of a card you hold, and where it sits. */
export type CardTitle = { name: string; hint: string };

/** A set the field can offer: the address the URL carries and the name a person reads. */
export type TitleSet = { name: string; title: string };

/** How many titles a field offers at once: enough to recognise yours, short enough to read in one look. */
export const TITLE_SUGGESTIONS = 7;

/** And how many sets under them: a shortcut, not a second list. */
export const SET_SUGGESTIONS = 3;

/**
 * The distinct titles in a batch of rows, in the order the API answered them.
 *
 * A title is what a person searches for ("Charizard", "Professor's Research"), and a collection
 * holds it several times over: three printings, two copies of one. So the rows are folded to
 * their names, and the hint says which of the two it is: the set, where the title is one row in
 * hand, and otherwise how many rows carry the name.
 */
export function distinctTitles(cards: Card[], limit = Infinity): CardTitle[] {
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

/** The titles this term asks for, best first, out of every title held: the search a browser can do itself. */
export const matchTitles = (titles: CardTitle[], term: string, limit = TITLE_SUGGESTIONS): CardTitle[] =>
    rank(
        titles.filter((title) => band(title.name, term) < 3),
        term,
        (title) => title.name,
    ).slice(0, limit);

/** The same for the sets held, matched on the name a person reads. */
export const matchSets = (sets: TitleSet[], term: string, limit = SET_SUGGESTIONS): TitleSet[] =>
    rank(
        sets.filter((set) => band(set.title, term) < 3),
        term,
        (set) => set.title,
    ).slice(0, limit);
