/**
 * How well a name answers what was typed, and the order that follows from it.
 *
 * Every search in this app matches the letters wherever they sit, because that is what the API
 * and the catalogue document both do. That is right by the letters and wrong by what anyone
 * meant: "char" answered Pecharunt ex on top of a list of Charizards. So the hits are put in
 * bands by where the term sits in the name, and the order inside a band is left alone.
 */

/** 0 the name starts with the term, 1 a word inside it does, 2 it is in there somewhere, 3 it is not. */
export function band(name: string, term: string): number {
    const where = name.toLowerCase().indexOf(term.toLowerCase());
    if (where < 0) return 3;
    if (where === 0) return 0;
    // A word starts after a space or a punctuation mark: "Giovanni's Charisma" starts a word at C.
    return /[\s'’\-.:(]/.test(name[where - 1]) ? 1 : 2;
}

/** The best band any of these words reaches in the name: "base charizard" is a Charizard, by its name. */
export const bestBand = (name: string, terms: readonly string[]): number => terms.reduce((best, term) => Math.min(best, band(name, term)), 3);

/** The same order, over anything with a name: what starts with the term first, the rest behind it. */
export function rank<T>(items: T[], term: string, nameOf: (item: T) => string): T[] {
    return items
        .map((item, at) => ({ item, at, band: band(nameOf(item), term) }))
        .sort((a, b) => a.band - b.band || a.at - b.at)
        .map((entry) => entry.item);
}
