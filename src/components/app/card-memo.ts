import { type CardFacts, type PricePoint, cardFacts, cardPriceHistory } from "@/app/(app)/dashboard/cards/actions";

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
const PRICES_SEEN = new Map<string, PricePoint[]>();
const PRICES_ASKED = new Map<string, Promise<PricePoint[]>>();

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

export function preloadCardFacts(tcgId: string): Promise<CardFacts | null> {
    return once(FACTS_SEEN, FACTS_ASKED, tcgId, () => cardFacts(tcgId));
}

/** What is already known, without asking: the answer, null for a card the catalogue cannot place, undefined for one not asked yet. */
export function knownCardFacts(tcgId: string): CardFacts | null | undefined {
    return FACTS_SEEN.get(tcgId);
}

export function preloadPriceHistory(tcgId: string): Promise<PricePoint[]> {
    return once(PRICES_SEEN, PRICES_ASKED, tcgId, () => cardPriceHistory(tcgId));
}

export function knownPriceHistory(tcgId: string): PricePoint[] | undefined {
    return PRICES_SEEN.get(tcgId);
}

/**
 * Everything opening a card's sheet will ask for, asked now: the sheet's own code, the facts, the
 * line. A tile calls this when the pointer rests on it, so the first open is as complete as the
 * second. Nothing is awaited and nothing can fail here: each ask keeps its own answer, and one
 * that is refused is simply asked again by the sheet.
 */
export function warmCard(tcgId: string | null) {
    void import("@/components/app/card-detail-slideout");
    if (!tcgId) return;
    void preloadCardFacts(tcgId);
    void preloadPriceHistory(tcgId);
}

/** For tests: forget everything learned so far. */
export function forgetCards() {
    FACTS_SEEN.clear();
    FACTS_ASKED.clear();
    PRICES_SEEN.clear();
    PRICES_ASKED.clear();
}
