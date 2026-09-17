import { vi } from "vitest";
import type { Card, RemovedCard } from "@/lib/api-shapes";

/*
 * Shared pieces for the tests of the "latest press wins" write engines (useCopySteps, useWishStep,
 * settleLatest, the card sheet's star). A write here is a promise the test answers by hand, in any
 * order, so a press can land while another one is in the air.
 *
 * The module mocks are factories to hand to vi.mock through a dynamic import, because vi.mock is
 * hoisted above the imports of the test file:
 *
 *     vi.mock("next/navigation", async () => (await import("@/test/press-harness")).navigationMock());
 *
 * The spies they return are the ones exported here, so a test reads `router.refresh` directly.
 */

export type Outcome = { ok: true } | { ok: false; error: string };

export type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};

export function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

export type HeldCall<A extends unknown[], R> = { args: A; answered: boolean } & Deferred<R>;

// Every call a test left in the air, so `answerLeftovers` can land them before the next test.
const leftovers: Array<() => void> = [];

/**
 * A fake server action whose every call waits until the test answers it: `calls[i].resolve(...)`
 * or `calls[i].reject(...)`, in whatever order the test likes.
 *
 * `fallback` is what a call the test never answered gets from `answerLeftovers`: the page hold
 * (`holdPage`) is one counter for the whole file, and a write left flying keeps it held for the
 * tests after it.
 */
export function heldAction<A extends unknown[], R>(fallback?: R) {
    const calls: HeldCall<A, R>[] = [];
    const fn = vi.fn((...args: A) => {
        const d = deferred<R>();
        const call: HeldCall<A, R> = {
            args,
            answered: false,
            promise: d.promise,
            resolve: (value) => {
                call.answered = true;
                d.resolve(value);
            },
            reject: (reason) => {
                call.answered = true;
                d.reject(reason);
            },
        };
        leftovers.push(() => {
            if (!call.answered) call.resolve(fallback as R);
        });
        calls.push(call);
        return call.promise;
    });
    return { fn, calls };
}

/** Answers every held call a test left in the air with its fallback. Call it inside act() in afterEach. */
export async function answerLeftovers() {
    while (leftovers.length) {
        for (const answer of leftovers.splice(0)) answer();
        await flush();
    }
}

/** The Next router every test sees. */
export const router = {
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
};
export const pathname = { current: "/dashboard/cards" };

export const navigationMock = () => ({
    useRouter: () => router,
    usePathname: () => pathname.current,
    useSearchParams: () => new URLSearchParams(),
});

/** The toasts, as spies: `notify.done.mock.calls` holds each toast's options, its Undo among them. */
export const notifyMock = {
    done: vi.fn(),
    removed: vi.fn(),
    failed: vi.fn(),
    dismiss: vi.fn(),
};
export const toastMock = () => ({ notify: notifyMock, Toasts: () => null });

/** The quiet cache drop, answered at once unless a test swaps the implementation. */
export const forgetMine = vi.fn<(write?: string) => Promise<undefined>>(async () => undefined);
export const forgetMineMock = () => ({ forgetMineQuietly: forgetMine, CARDS_CHANGED: "cardorb:cards-changed" });

/** Every export of the cards actions module, as a plain spy a test gives an implementation. */
export const cardsActionsMock = () => ({
    searchMyCards: vi.fn(async () => []),
    collectionIndex: vi.fn(),
    suggestCardTitles: vi.fn(async () => []),
    searchPokemon: vi.fn(),
    addCard: vi.fn(async () => ({ ok: true, id: "added-row" })),
    setCopies: vi.fn(async () => ({ ok: true })),
    rereadMine: vi.fn(async () => undefined),
    removeCard: vi.fn(async () => ({ ok: true })),
    restoreCard: vi.fn(async () => ({ ok: true })),
    setFavorite: vi.fn(async () => ({ ok: true })),
    setDexFace: vi.fn(async () => ({ ok: true })),
    cardPriceHistory: vi.fn(async () => []),
    seriesLogo: vi.fn(async () => null),
    listRows: vi.fn(async () => []),
    listSetRows: vi.fn(async () => null),
    addCopy: vi.fn(async () => ({ ok: true })),
    splitCopy: vi.fn(async () => ({ ok: true })),
    cardFacts: vi.fn(async () => null),
    cardFactsMany: vi.fn(async () => ({})),
    editCopies: vi.fn(async () => ({ ok: true })),
    markOwnedWith: vi.fn(async () => ({ ok: true })),
});

/** Whether a write the page holds would make a reload ask "Leave site?" (`holdPage`). */
export const pageHeld = () => document.documentElement.hasAttribute("data-unsent-writes");

/** Lets every promise already answered run its handlers. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let made = 0;

/** A row somebody owns, one copy, with every field a sheet reads; override what the test is about. */
export function makeCard(overrides: Partial<Card> = {}): Card {
    made += 1;
    return {
        id: `row-${made}`,
        name: "Pikachu",
        local_name: null,
        set_name: "Base Set",
        set_abbr: "BS",
        set: "base1",
        number: "58",
        rarity: "Common",
        gen: null,
        types: ["Lightning"],
        quantity: 1,
        owned: true,
        is_favorite: false,
        dex_face: false,
        excluded: false,
        condition: "Near Mint",
        grade: null,
        language: "en",
        finish: "normal",
        foil_pattern: null,
        edition: null,
        price_first_ed: null,
        price_source: null,
        price_printing: null,
        tcgplayer_id: null,
        purchase_price: null,
        purchase_date: null,
        acquired_at: null,
        notes: null,
        price: 1.5,
        image_url: null,
        image_high_url: null,
        tcg_id: null,
        collection_id: null,
        wishlist: false,
        species_id: 25,
        species_ids: [25],
        ...overrides,
    };
}

/** What a removal hands back for its Put back. */
export function makeRemoved(overrides: Partial<RemovedCard> = {}): RemovedCard {
    return { name: "Pikachu", setName: "Base Set", number: "58", owned: true, ...overrides };
}

/**
 * What jsdom lacks and a rendered sheet asks for: media queries (answered as a wide screen with
 * reduced motion, so nothing animates), size and intersection observers, and Web Animations.
 */
export function stubBrowser() {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
    }));
    class Observer {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    }
    vi.stubGlobal("ResizeObserver", Observer);
    vi.stubGlobal("IntersectionObserver", Observer);
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status: 204 })),
    );
    if (!Element.prototype.animate) {
        Element.prototype.animate = function () {
            return { cancel() {}, finish() {}, onfinish: null, oncancel: null } as unknown as Animation;
        };
    }
}
