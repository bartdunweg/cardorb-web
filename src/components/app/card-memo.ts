import { type CardFacts, type PricePoint, cardFacts, cardFactsMany, cardPriceHistory } from "@/app/(app)/dashboard/cards/actions";
import { CARD_FACTS_BATCH } from "@/lib/api-shapes";

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
const PRICES_SEEN = new Map<string, { points: PricePoint[]; at: number }>();
const PRICES_ASKED = new Map<string, Promise<PricePoint[]>>();

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
 * joins it. An empty answer never replaces a line with readings: cardPriceHistory answers an API it
 * could not reach as empty, and a card does not lose its past, so the known line stands and the
 * next ask tries again.
 */
export function preloadPriceHistory(tcgId: string): Promise<PricePoint[]> {
    const known = PRICES_SEEN.get(tcgId);
    if (known && Date.now() - known.at < PRICES_FRESH_MS) return Promise.resolve(known.points);
    const open = PRICES_ASKED.get(tcgId);
    if (open) return open;
    const p = cardPriceHistory(tcgId).then((points) => {
        PRICES_ASKED.delete(tcgId);
        const before = PRICES_SEEN.get(tcgId);
        if (!points.length && before?.points.length) return before.points;
        PRICES_SEEN.set(tcgId, { points, at: Date.now() });
        return points;
    });
    PRICES_ASKED.set(tcgId, p);
    return p;
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

/** For tests: forget everything learned so far. */
export function forgetCards() {
    FACTS_SEEN.clear();
    FACTS_ASKED.clear();
    FACTS_PAGED.clear();
    PRICES_SEEN.clear();
    PRICES_ASKED.clear();
}
