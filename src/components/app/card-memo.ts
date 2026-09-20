import type { CardFacts, PricePoint } from "@/app/(app)/dashboard/cards/actions";
import { CARD_FACTS_BATCH } from "@/lib/card-shapes";
import type { Card } from "@/lib/cards";
import { type CardName, sameCard } from "@/lib/copies";
import { cardFacts, cardFactsMany, cardPriceHistory, isReadFailed, listSetRows } from "@/lib/reads";

/**
 * What the catalogue has said about a printing, kept for as long as the page lives.
 *
 * Facts and price readings are about a card rather than about anybody's copy (an illustrator
 * and last Tuesday's price do not change while somebody browses), so asking twice is a wait
 * nobody needed. Held here rather than in a provider because it is a memo, not state: nothing
 * renders from it directly, and losing it on a navigation costs one fetch.
 *
 * A null answer is kept too. A card the catalogue cannot place should not be asked about again
 * every time its sheet opens.
 *
 * One module for both, and outside the sheet, because a tile warms them before the sheet exists:
 * importing the sheet to reach its memo would pull the app's largest client chunk into every grid.
 */
const FACTS_SEEN = new Map<string, CardFacts | null>();
const FACTS_ASKED = new Map<string, Promise<CardFacts | null>>();
/** A card whose page of facts is out (warmCardFacts): its answer, or undefined where the page had none for it. */
const FACTS_PAGED = new Map<string, Promise<CardFacts | undefined>>();
/** A price line with the moment it was read: the facts never change, the line gains a day every night. */
const PRICES_SEEN = new Map<string, { points: PricePoint[]; listings: Record<string, number>; at: number }>();
const PRICES_ASKED = new Map<string, Promise<PricePoint[]>>();
/** Cards whose last read of the line did not answer: a chart with nothing to draw says which of the two it is. */
const PRICES_FAILED = new Set<string>();

/**
 * How long a known line is taken as current. Past it, the next ask still answers the known line at
 * once (knownPriceHistory) but reads the line again behind it, so a tab left open since Sunday
 * draws Monday's point on the next open rather than never (Bart, 2026-09-15).
 */
export const PRICES_FRESH_MS = 10 * 60_000;

/**
 * Where a card's facts are kept: its id, and the catalogue before it for a Japanese card. The two
 * catalogues share 14 ids (neo4-100 to neo4-113), and a Japanese card's facts are not the English one's.
 */
const factsKey = (tcgId: string, language?: string | null) => (language === "ja" ? `ja:${tcgId}` : tcgId);

/** One answer per card, however many ask; a second ask while the first is out joins it. */
function once<T>(seen: Map<string, T>, asked: Map<string, Promise<T>>, key: string, ask: () => Promise<T>): Promise<T> {
    if (seen.has(key)) return Promise.resolve(seen.get(key) as T);
    const open = asked.get(key);
    if (open) return open;
    const p = ask().then((answer) => {
        seen.set(key, answer);
        asked.delete(key);
        return answer;
    });
    asked.set(key, p);
    return p;
}

export function preloadCardFacts(tcgId: string, language?: string | null): Promise<CardFacts | null> {
    const key = factsKey(tcgId, language);
    /* A sheet opened while its grid's page is still out joins that page, and asks the card alone
       only where the page came back without it. */
    const paged = FACTS_PAGED.get(key);
    if (paged) return paged.then((found) => found ?? preloadCardFacts(tcgId, language));
    return once(FACTS_SEEN, FACTS_ASKED, key, () => cardFacts(tcgId, language));
}

/**
 * Every card of a grid, asked in one request a page (cardFactsMany), so a sheet opened on any of them
 * knows its choices on its first paint rather than drawing them in half a second later (Bart,
 * 2026-09-15: nothing shown that cannot be chosen, and nothing loaded after the panel opens).
 *
 * Only what is not known or asked already. A card the page does not answer is left unknown, never
 * null: null would be "the catalogue cannot place it" and stop its sheet asking, where the page's
 * silence only means the API's copy could not answer in full, and the card alone still can.
 * Nothing is awaited and nothing can fail here.
 */
export function warmCardFacts(tcgIds: (string | null | undefined)[], language?: string | null) {
    const wanted = [...new Set(tcgIds)].filter((id): id is string => {
        if (typeof id !== "string" || id === "") return false;
        const key = factsKey(id, language);
        return !FACTS_SEEN.has(key) && !FACTS_ASKED.has(key) && !FACTS_PAGED.has(key);
    });
    for (let at = 0; at < wanted.length; at += CARD_FACTS_BATCH) {
        const ids = wanted.slice(at, at + CARD_FACTS_BATCH);
        const page = cardFactsMany(ids, language).catch(() => ({}) as Record<string, CardFacts>);
        for (const id of ids) {
            const key = factsKey(id, language);
            FACTS_PAGED.set(
                key,
                page.then((found) => {
                    FACTS_PAGED.delete(key);
                    const facts = found[id];
                    if (facts && !FACTS_SEEN.has(key)) FACTS_SEEN.set(key, facts);
                    return facts;
                }),
            );
        }
    }
}

/** What is already known, without asking: the answer, null for a card the catalogue cannot place, undefined for one not asked yet. */
export function knownCardFacts(tcgId: string, language?: string | null): CardFacts | null | undefined {
    return FACTS_SEEN.get(factsKey(tcgId, language));
}

/**
 * The card's line: the known one while it is fresh, else read again. A second ask while one is out
 * joins it. A read that did not answer never replaces a line with readings: a card does not lose
 * its past, so the known line stands, the failure is noted for a chart with nothing to draw, and
 * the next ask tries again.
 */
export function preloadPriceHistory(tcgId: string): Promise<PricePoint[]> {
    const known = PRICES_SEEN.get(tcgId);
    if (known && Date.now() - known.at < PRICES_FRESH_MS) return Promise.resolve(known.points);
    const open = PRICES_ASKED.get(tcgId);
    if (open) return open;
    const p = cardPriceHistory(tcgId).then((answer) => {
        PRICES_ASKED.delete(tcgId);
        const before = PRICES_SEEN.get(tcgId);
        if (isReadFailed(answer)) {
            PRICES_FAILED.add(tcgId);
            return before?.points ?? [];
        }
        PRICES_FAILED.delete(tcgId);
        const { points, listings } = answer;
        if (!points.length && before?.points.length) return before.points;
        PRICES_SEEN.set(tcgId, { points, listings, at: Date.now() });
        return points;
    });
    PRICES_ASKED.set(tcgId, p);
    return p;
}

/** Whether the last read of this card's line did not answer, so a chart with no points says that instead of "no readings". */
export function priceHistoryFailed(tcgId: string): boolean {
    return PRICES_FAILED.has(tcgId);
}

/** Ask for this card's line again, whatever is known of it: what the chart's Try again presses. */
export function forgetPriceHistory(tcgId: string) {
    PRICES_SEEN.delete(tcgId);
    PRICES_ASKED.delete(tcgId);
    PRICES_FAILED.delete(tcgId);
}

/**
 * Today's lowest listing of each printing the card's line has no figure for, as the line's read
 * answered it (cardorb-api#561): what a sheet shows for a pressed printing listed and never sold.
 */
export function knownPriceListings(tcgId: string): Record<string, number> | undefined {
    return PRICES_SEEN.get(tcgId)?.listings;
}

/** The line already read, fresh or not, without asking: what a sheet draws while it asks again. */
export function knownPriceHistory(tcgId: string): PricePoint[] | undefined {
    return PRICES_SEEN.get(tcgId)?.points;
}

/**
 * Everything opening a card's sheet will ask for, asked now: the sheet's own code, the facts, the
 * line. A tile calls this when the pointer rests on it, so the first open is as complete as the
 * second. Nothing is awaited and nothing can fail here: each ask keeps its own answer, and one
 * that is refused is simply asked again by the sheet.
 */
export function warmCard(tcgId: string | null, language?: string | null) {
    void import("@/components/app/card-detail-slideout");
    if (!tcgId) return;
    void preloadCardFacts(tcgId, language);
    void preloadPriceHistory(tcgId);
}

/*
 * Your rows in a set, held and wished for: what a set page's sheet opens on and lists under Your
 * copies. Unlike facts they are somebody's and change with every write, so they are kept for one
 * drawing of the page only: the page warms them again each time it is drawn (a refresh after a
 * write included), and a new warm forgets the old rows before its answer is in, so a sheet never
 * opens on rows a write has made untrue. Keyed by the set's name as the set page has it.
 */
const ROWS_SEEN = new Map<string, Card[]>();
const ROWS_ASKED = new Map<string, Promise<Card[] | null>>();
/** The drawing of the page each set's rows were last asked for: the same drawing asks once. */
const ROWS_DRAWING = new Map<string, object>();

/**
 * Every row of one set, in one request, once the page is drawn (listSetRows). A sheet opened on a
 * card of it then has the card's row and its copies on its first paint, instead of reading them
 * after the tap (1.3 s measured on Base Set, 2026-09-15). Nothing is awaited and nothing can fail.
 */
export function warmSetRows(set: string, drawing: object) {
    if (!set || ROWS_DRAWING.get(set) === drawing) return;
    ROWS_DRAWING.set(set, drawing);
    ROWS_SEEN.delete(set);
    const p = listSetRows(set)
        .catch(() => null)
        .then((rows) => {
            // Only the latest warm writes: an older answer that lands after it is from before a write.
            if (ROWS_ASKED.get(set) !== p) return rows;
            ROWS_ASKED.delete(set);
            if (rows) ROWS_SEEN.set(set, rows);
            return rows;
        });
    ROWS_ASKED.set(set, p);
}

const rowsOf = (rows: Card[], card: CardName) => rows.filter((r) => sameCard(r, card));
const setKeys = (card: CardName) => [card.set_name, card.set].filter((s): s is string => Boolean(s));

/** A card's rows, held and wished, without asking: undefined where its set's rows are not in. */
export function knownRows(card: CardName): Card[] | undefined {
    for (const key of setKeys(card)) {
        const rows = ROWS_SEEN.get(key);
        if (rows) return rowsOf(rows, card);
    }
    return undefined;
}

/** A card's rows once its set's warm answers; undefined where none is out or it could not answer. */
export function awaitRows(card: CardName): Promise<Card[] | undefined> | undefined {
    for (const key of setKeys(card)) {
        const asked = ROWS_ASKED.get(key);
        if (asked) return asked.then((rows) => (rows ? rowsOf(rows, card) : undefined));
    }
    return undefined;
}

/** The copies a sheet has just read for a card, put in place of the ones kept, so the next open shows them. */
export function rememberCopies(card: CardName, copies: Card[]) {
    for (const key of setKeys(card)) {
        const rows = ROWS_SEEN.get(key);
        if (!rows) continue;
        ROWS_SEEN.set(key, [...rows.filter((r) => !(r.owned && sameCard(r, card))), ...copies]);
        return;
    }
}

/** For tests: forget everything learned so far. */
export function forgetCards() {
    ROWS_SEEN.clear();
    ROWS_ASKED.clear();
    ROWS_DRAWING.clear();
    FACTS_SEEN.clear();
    FACTS_ASKED.clear();
    FACTS_PAGED.clear();
    PRICES_SEEN.clear();
    PRICES_ASKED.clear();
    PRICES_FAILED.clear();
}
