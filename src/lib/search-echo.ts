// A search field writes its term to the URL a moment after the last keystroke, and the page comes
// back with it a moment later. By then the field may hold something newer, so a URL that only
// repeats a term the field wrote is not a reason to change the box: taking it put "char" back over
// "charizard". Only a URL the field did not write (Back, a set chosen, a filter cleared) is.

/** The terms a field wrote that the page has not come back with yet, oldest first. */
export type Sent = readonly string[];

/** A term written: kept once, so a term sent twice in a row is one answer to wait for. */
export function wrote(sent: Sent, term: string): Sent {
    return sent.at(-1) === term ? sent : [...sent, term];
}

/**
 * The URL now says `urlTerm`. An echo of a written term leaves the box alone and forgets that term
 * and every older one (a newer navigation replaces an older one, so those will not come back). Any
 * other term is news: the box takes it and nothing is waited for any more.
 */
export function heard(sent: Sent, urlTerm: string): { sent: Sent; take: boolean } {
    const echo = sent.lastIndexOf(urlTerm.trim());
    if (echo < 0) return { sent: [], take: true };
    return { sent: sent.slice(echo + 1), take: false };
}
