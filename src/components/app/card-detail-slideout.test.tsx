import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { editCopies, removeCard, restoreCard, setCopies, setFavorite } from "@/app/(app)/dashboard/cards/actions";
import { knownCardFacts, knownPriceHistory, knownPriceListings } from "@/components/app/card-memo";
import type { Card } from "@/lib/api-shapes";
import { listCopies, loadFacets, tryListBinders } from "@/lib/reads";
import {
    type Outcome,
    answerLeftovers,
    flush,
    forgetMine,
    heldAction,
    makeCard,
    makeRemoved,
    notifyMock,
    pathname,
    router,
    stubBrowser,
} from "@/test/press-harness";
import { CardDetailSlideout } from "./card-detail-slideout";

/*
 * The card sheet, rendered whole with its actions and reads mocked: a safety net for splitting
 * card-detail-slideout.tsx. A smoke pass over what a person does in it, then the star's chain of
 * writes (a promise queue and a tap counter, ~line 334) under rapid taps and failures.
 */

vi.mock("@/app/(app)/dashboard/cards/actions", async () => (await import("@/test/press-harness")).cardsActionsMock());
vi.mock("@/components/app/toast", async () => (await import("@/test/press-harness")).toastMock());
vi.mock("@/lib/forget-mine", async () => (await import("@/test/press-harness")).forgetMineMock());
vi.mock("next/navigation", async () => (await import("@/test/press-harness")).navigationMock());
/** The read that did not answer, as `@/lib/reads` has it; hoisted with the mock that uses it. */
const FAILED_READ = vi.hoisted(() => Symbol("read failed"));
vi.mock("@/lib/reads", () => ({
    isReadFailed: (a: unknown) => a === FAILED_READ,
    tryListBinders: vi.fn(async () => []),
    listBinders: vi.fn(async () => []),
    listCopies: vi.fn(async () => []),
    loadFacets: vi.fn(async () => ({})),
    seriesLogo: vi.fn(async () => null),
}));
vi.mock("@/lib/keep-press-client", () => ({ keepPress: vi.fn() }));
// The memo would carry rows and facts from one test into the next.
vi.mock("@/components/app/card-memo", () => ({
    knownCardFacts: vi.fn(() => null),
    knownPriceHistory: vi.fn(() => []),
    knownPriceListings: vi.fn(() => undefined),
    knownRows: vi.fn(() => undefined),
    preloadCardFacts: vi.fn(async () => null),
    preloadPriceHistory: vi.fn(async () => []),
    priceHistoryFailed: vi.fn(() => false),
    forgetPriceHistory: vi.fn(),
    rememberCopies: vi.fn(),
    warmCard: vi.fn(),
}));

type Removed = Outcome & { card?: ReturnType<typeof makeRemoved> };

const open = async (card: Card, props: Partial<Parameters<typeof CardDetailSlideout>[0]> = {}) => {
    const onClose = vi.fn();
    const view = render(<CardDetailSlideout card={card} onClose={onClose} {...(props as object)} />);
    // The copies, binders and facets the sheet reads when it opens.
    await act(flush);
    return { ...view, onClose };
};

const star = () => screen.getByRole("button", { name: "Favorite" });
const tap = async (el: HTMLElement) => {
    await act(async () => {
        fireEvent.click(el);
        await flush();
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    stubBrowser();
    pathname.current = "/dashboard/cards";
    vi.mocked(listCopies).mockImplementation(async (card) => [card as Card]);
    vi.mocked(tryListBinders).mockResolvedValue([]);
    vi.mocked(setCopies).mockResolvedValue({ ok: true });
    vi.mocked(removeCard).mockResolvedValue({ ok: true });
    vi.mocked(restoreCard).mockResolvedValue({ ok: true });
    vi.mocked(editCopies).mockResolvedValue({ ok: true });
    vi.mocked(setFavorite).mockResolvedValue({ ok: true });
    forgetMine.mockResolvedValue(undefined);
});

afterEach(async () => {
    await act(answerLeftovers);
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("CardDetailSlideout: the price of a pressed printing", () => {
    /* cardorb-api#561: pressing a printing TCGplayer lists and has never sold said "No price for this
       printing". It has no line; its lowest listing comes beside the history and is said as one. */
    // Back to the memo's empty answers: a known card here would open every later test's sheet on it.
    afterEach(() => {
        vi.mocked(knownCardFacts).mockReset();
        vi.mocked(knownPriceHistory).mockReset();
        vi.mocked(knownPriceListings).mockReset();
    });

    const pressReverse = async (listings: Record<string, number> | undefined) => {
        vi.mocked(knownCardFacts).mockReturnValue({
            printings: [
                { finish: "normal", foilPattern: null },
                { finish: "reverse-holo", foilPattern: null },
            ],
        } as never);
        vi.mocked(knownPriceHistory).mockReturnValue([{ date: "2026-09-18", market: 5, holo: null, printings: { normal: 5 } }]);
        vi.mocked(knownPriceListings).mockReturnValue(listings);
        await open(makeCard({ id: "p1", tcg_id: "sv1-1", finish: "normal", price: 5 }));
        await tap(screen.getByRole("tab", { name: "Reverse" }));
    };

    it("shows the pressed printing's lowest listing, labelled, where it has no market figure", async () => {
        await pressReverse({ "reverse-holofoil": 5771.49 });
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent("From €5,771.49");
        expect(dialog).toHaveTextContent("Lowest listing on TCGplayer, no sales yet");
        expect(dialog).not.toHaveTextContent("No price for this printing");
    });

    it("still says no price for a printing with neither", async () => {
        await pressReverse(undefined);
        expect(screen.getByRole("dialog")).toHaveTextContent("No price for this printing");
    });
});

describe("CardDetailSlideout: smoke", () => {
    it("opens on a card with its name, its copies and the star", async () => {
        const card = makeCard({ id: "p1", name: "Pikachu" });
        await open(card);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Pikachu" })).toBeInTheDocument();
        expect(listCopies).toHaveBeenCalledWith(card);
        expect(star()).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByRole("button", { name: "One copy more" })).toBeInTheDocument();
        expect(within(screen.getByRole("list", { name: "In binders" })).getByText("None yet")).toBeInTheDocument();
    });

    it("steps to the next and previous card with the arrow keys and the chevrons", async () => {
        const first = makeCard({ id: "p1", name: "Pikachu" });
        const second = makeCard({ id: "r1", name: "Raichu", number: "14" });
        const onNext = vi.fn();
        const onPrev = vi.fn();
        const { rerender, onClose } = await open(first, { onNext, onPrev });

        fireEvent.keyDown(document.body, { key: "ArrowRight" });
        expect(onNext).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(document.body, { key: "ArrowLeft" });
        expect(onPrev).toHaveBeenCalledTimes(1);
        // Not while a modifier is held: that is the browser's shortcut.
        fireEvent.keyDown(document.body, { key: "ArrowRight", metaKey: true });
        expect(onNext).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", { name: "Next card" }));
        expect(onNext).toHaveBeenCalledTimes(2);
        fireEvent.click(screen.getByRole("button", { name: "Previous card" }));
        expect(onPrev).toHaveBeenCalledTimes(2);

        // The list hands the sheet its next card.
        rerender(<CardDetailSlideout card={second} onClose={onClose} onNext={onNext} onPrev={onPrev} />);
        await act(flush);
        expect(screen.getByRole("heading", { name: "Raichu" })).toBeInTheDocument();
        expect(listCopies).toHaveBeenLastCalledWith(second);
    });

    it("draws no chevrons where the list has no neighbours", async () => {
        await open(makeCard({ id: "p1" }));
        expect(screen.queryByRole("button", { name: "Next card" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Previous card" })).toBeNull();
    });

    it("steps copies up and down, folding presses made while a write flies into one write", async () => {
        const writes = heldAction<[string, number, { reread?: boolean }?], Outcome>({ ok: false, error: "left over" });
        vi.mocked(setCopies).mockImplementation(writes.fn);
        await open(makeCard({ id: "p1", quantity: 1 }));

        await tap(screen.getByRole("button", { name: "One copy more" }));
        await tap(screen.getByRole("button", { name: "One copy more" }));
        await tap(screen.getByRole("button", { name: "One copy more" }));
        expect(setCopies).toHaveBeenCalledTimes(1);
        expect(setCopies).toHaveBeenLastCalledWith("p1", 2, { reread: false });
        // Past one, the minus takes a copy rather than the row.
        expect(screen.getByRole("button", { name: "One copy fewer" })).toBeInTheDocument();

        await act(async () => writes.calls[0]!.resolve({ ok: true }));
        await act(flush);
        expect(setCopies).toHaveBeenCalledTimes(2);
        expect(setCopies).toHaveBeenLastCalledWith("p1", 4, { reread: false });
        // No re-read until the last write has landed.
        expect(forgetMine).not.toHaveBeenCalled();

        // The store as the writes left it, for the read that follows the last one.
        vi.mocked(listCopies).mockResolvedValue([makeCard({ id: "p1", quantity: 4 })]);
        await act(async () => writes.calls[1]!.resolve({ ok: true }));
        await act(flush);
        expect(forgetMine).toHaveBeenCalledWith("cards", null);
        expect(listCopies).toHaveBeenCalledTimes(2);

        await tap(screen.getByRole("button", { name: "One copy fewer" }));
        expect(setCopies).toHaveBeenLastCalledWith("p1", 3, { reread: false });
    });

    it("says so when the number of copies is refused", async () => {
        vi.mocked(setCopies).mockResolvedValue({ ok: false, error: "No" });
        await open(makeCard({ id: "p1", quantity: 1 }));

        await tap(screen.getByRole("button", { name: "One copy more" }));
        await act(flush);

        expect(notifyMock.writeFailed).toHaveBeenCalledWith("The number of copies did not change", { ok: false, error: "No" });
    });

    /*
     * An action that throws (no signal, a deploy in between) follows the refused path through
     * orFailed: a toast, the cache dropped and the copies read back, and no unhandled rejection.
     */
    it("says so and reads the copies back when setCopies throws instead of answering", async () => {
        vi.mocked(setCopies).mockRejectedValue(new Error("offline"));
        await open(makeCard({ id: "p1", quantity: 1 }));

        await tap(screen.getByRole("button", { name: "One copy more" }));
        await act(flush);
        await act(flush);

        expect(notifyMock.writeFailed).toHaveBeenCalledWith("The number of copies did not change", expect.anything());
        expect(forgetMine).toHaveBeenCalledWith("cards", null);
    });

    it("removes the last copy with the minus, says so, and puts it back", async () => {
        const removed = makeRemoved();
        const removals = heldAction<[string, { reread?: boolean }?], Removed>({ ok: false, error: "left over" });
        vi.mocked(removeCard).mockImplementation(removals.fn);
        await open(makeCard({ id: "p1", quantity: 1 }));

        // The minus beside the count; the link under the copy says the same.
        await tap(screen.getAllByRole("button", { name: "Remove this copy" })[0]!);
        expect(removeCard).toHaveBeenCalledWith("p1", { reread: false });
        await act(async () => removals.calls[0]!.resolve({ ok: true, card: removed }));
        await act(flush);

        expect(screen.getByText("That was the last copy; it has left your collection.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add to collection" })).toBeInTheDocument();
        const [title, options] = notifyMock.removed.mock.calls.at(-1)!;
        expect(title).toBe("Copy removed");
        const undo = (options as { undo: { label: string; onUndo: () => void } }).undo;
        expect(undo.label).toBe("Put back");

        await act(async () => {
            undo.onUndo();
            await flush();
        });
        await act(flush);

        expect(restoreCard).toHaveBeenCalledWith(removed, { reread: false });
        expect(notifyMock.done).toHaveBeenCalledWith("It is back");
        expect(screen.queryByText("That was the last copy; it has left your collection.")).toBeNull();
        expect(screen.getByRole("button", { name: "One copy more" })).toBeInTheDocument();
    });

    it("files a held card into the binder whose page it was opened on, at once, and puts it back on a refusal", async () => {
        pathname.current = "/dashboard/collections/b1";
        vi.mocked(tryListBinders).mockResolvedValue([{ id: "b1", name: "Shinies", rule: null }]);
        const edits = heldAction<[string[], unknown, unknown], Outcome>({ ok: false, error: "left over" });
        vi.mocked(editCopies).mockImplementation(edits.fn as never);
        await open(makeCard({ id: "p1" }));

        await tap(screen.getByRole("button", { name: "Add to Shinies" }));

        expect(editCopies).toHaveBeenCalledWith(["p1"], { collectionId: "b1" }, { reread: false });
        expect(notifyMock.done).toHaveBeenCalledWith("Added to Shinies", { description: "Pikachu" });
        // On the press, before the store answers.
        expect(screen.queryByRole("button", { name: "Add to Shinies" })).toBeNull();
        expect(within(screen.getByRole("list", { name: "In binders" })).getByText("Shinies")).toBeInTheDocument();

        await act(async () => edits.calls[0]!.resolve({ ok: false, error: "No" }));
        await act(flush);
        expect(notifyMock.writeFailed).toHaveBeenCalledWith("Pikachu was not added to Shinies", { ok: false, error: "No" });
        expect(screen.getByRole("button", { name: "Add to Shinies" })).toBeInTheDocument();
    });

    /* On a binder's page the take waits for the binder list, so the card is filed where you are
       looking. A list that never answered is not a wait: Add to collection stayed dead for good
       while Add to wishlist beside it worked (error-path audit). */
    it("takes a card into the collection when the binder list did not answer, and says why it has no binder", async () => {
        pathname.current = "/dashboard/collections/b1";
        vi.mocked(tryListBinders).mockResolvedValue(FAILED_READ as never);
        await open(makeCard({ id: "c9", owned: false, wishlist: false }));

        const add = screen.getByRole("button", { name: "Add to collection" });
        expect(add).not.toBeDisabled();
        expect(screen.getByText("Your binders could not be loaded, so this card goes to your collection without one.")).toBeInTheDocument();
    });

    it("keeps Add to collection waiting while the binder list is still on its way", async () => {
        pathname.current = "/dashboard/collections/b1";
        let answer: (b: unknown) => void = () => {};
        vi.mocked(tryListBinders).mockReturnValue(new Promise((r) => (answer = r)) as never);
        await open(makeCard({ id: "c8", owned: false, wishlist: false }));

        expect(screen.getByRole("button", { name: "Add to collection" })).toBeDisabled();
        expect(screen.queryByText("Your binders could not be loaded, so this card goes to your collection without one.")).toBeNull();
        await act(async () => {
            answer([]);
            await flush();
        });
    });

    it("opens the Mark as owned dialog over a wish", async () => {
        await open(makeCard({ id: "w1", owned: false, wishlist: true }));

        expect(screen.getByText("On your wishlist; you do not hold it yet.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Favorite" })).toBeNull();
        const dialogs = () => document.querySelectorAll("[role='dialog']");
        expect(dialogs()).toHaveLength(1);

        await tap(screen.getByRole("button", { name: "Mark as owned" }));
        // The sheet under it is hidden from the accessibility tree while the form is open.
        expect(dialogs()).toHaveLength(2);
        expect(screen.getByRole("dialog")).toHaveTextContent("Pikachu");
    });

    it("leaves the arrow keys to a second dialog open over the sheet", async () => {
        const onNext = vi.fn();
        await open(makeCard({ id: "w1", owned: false, wishlist: true }), { onNext });
        await tap(screen.getByRole("button", { name: "Mark as owned" }));

        fireEvent.keyDown(document.body, { key: "ArrowRight" });
        expect(onNext).not.toHaveBeenCalled();
    });
});

describe("CardDetailSlideout: the star under rapid taps", () => {
    const favorites = () => {
        const writes = heldAction<[string, boolean, { reread?: boolean }?], Outcome>({ ok: false, error: "left over" });
        vi.mocked(setFavorite).mockImplementation(writes.fn);
        return writes;
    };

    it("fills on the press and settles on the last tap, one write in the air at a time", async () => {
        const writes = favorites();
        await open(makeCard({ id: "p1" }));

        await tap(star());
        await tap(star());
        await tap(star());
        expect(star()).toHaveAttribute("aria-pressed", "true");
        expect(within(screen.getByRole("list", { name: "In binders" })).getByText("Favorites")).toBeInTheDocument();
        expect(writes.calls).toHaveLength(1);

        await act(async () => writes.calls[0]!.resolve({ ok: true }));
        expect(writes.calls).toHaveLength(2);
        await act(async () => writes.calls[1]!.resolve({ ok: true }));
        expect(writes.calls).toHaveLength(3);
        // Only the last tap drops the cache.
        expect(forgetMine).not.toHaveBeenCalled();
        await act(async () => writes.calls[2]!.resolve({ ok: true }));
        await act(flush);

        /* Every tap is written, in order: the chain does not fold taps the way settleLatest folds
           copy presses, so three taps are three writes where one would do. Pinned as it is today. */
        expect(writes.calls.map((c) => c.args)).toEqual([
            ["p1", true, { reread: false }],
            ["p1", false, { reread: false }],
            ["p1", true, { reread: false }],
        ]);
        expect(forgetMine).toHaveBeenCalledTimes(1);
        expect(forgetMine).toHaveBeenCalledWith("favorite");
        expect(star()).toHaveAttribute("aria-pressed", "true");
        expect(notifyMock.failed).not.toHaveBeenCalled();
    });

    it("refreshes the list behind once, half a second after the last tap has landed", async () => {
        await open(makeCard({ id: "p1" }));
        vi.useFakeTimers();

        await act(async () => {
            fireEvent.click(star());
            fireEvent.click(star());
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(router.refresh).not.toHaveBeenCalled();
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(router.refresh).toHaveBeenCalledTimes(1);
    });

    /* What takes an unstarred card off the Favorites list at once: the list behind is read again
       after a write, and until that read lands, or where it never lands (a cache that has not caught
       up answers the refresh with the page from before the write), the card sat there still starred.
       Said on the press, not on the answer. */
    it("says the star changed on the press, before the write has landed", async () => {
        const writes = favorites();
        const onStarChanged = vi.fn();
        await open(makeCard({ id: "p1", is_favorite: true }), { onStarChanged });

        await tap(star());
        expect(onStarChanged).toHaveBeenCalledTimes(1);
        expect(onStarChanged).toHaveBeenCalledWith("p1", false);
        expect(writes.calls).toHaveLength(1);

        await act(async () => writes.calls[0]!.resolve({ ok: true }));
        await act(flush);
        expect(onStarChanged).toHaveBeenCalledTimes(1);
    });

    it("says the star is back when the write is refused, so the card returns to the list", async () => {
        const writes = favorites();
        const onStarChanged = vi.fn();
        await open(makeCard({ id: "p1", is_favorite: true }), { onStarChanged });

        await tap(star());
        await act(async () => writes.calls[0]!.resolve({ ok: false, error: "No" }));
        await act(flush);

        expect(onStarChanged.mock.calls).toEqual([
            ["p1", false],
            ["p1", true],
        ]);
        expect(star()).toHaveAttribute("aria-pressed", "true");
    });

    it("puts the star back when the last tap is refused", async () => {
        const writes = favorites();
        await open(makeCard({ id: "p1" }));

        await tap(star());
        await tap(star());
        await act(async () => writes.calls[0]!.resolve({ ok: true }));
        await act(async () => writes.calls[1]!.resolve({ ok: false, error: "No" }));
        await act(flush);

        expect(star()).toHaveAttribute("aria-pressed", "true");
        expect(notifyMock.writeFailed).toHaveBeenCalledTimes(1);
        expect(notifyMock.writeFailed).toHaveBeenCalledWith("That card is still a Favorite", { ok: false, error: "No" });
        expect(forgetMine).toHaveBeenCalledWith("favorite");
    });

    it("puts the star back when the last tap's write throws", async () => {
        const writes = favorites();
        await open(makeCard({ id: "p1" }));

        await tap(star());
        await act(async () => writes.calls[0]!.reject(new Error("offline")));
        await act(flush);

        expect(star()).toHaveAttribute("aria-pressed", "false");
        expect(notifyMock.failed).toHaveBeenCalledWith("That card is not a Favorite");
    });

    it("stays quiet about an earlier tap's failure once a later tap has landed", async () => {
        const writes = favorites();
        await open(makeCard({ id: "p1" }));

        await tap(star());
        await tap(star());
        await act(async () => writes.calls[0]!.resolve({ ok: false, error: "No" }));
        // The chain goes on to the next write after a refusal.
        expect(writes.calls).toHaveLength(2);
        await act(async () => writes.calls[1]!.resolve({ ok: true }));
        await act(flush);

        expect(star()).toHaveAttribute("aria-pressed", "false");
        expect(notifyMock.failed).not.toHaveBeenCalled();
    });

    /*
     * A failed last tap puts the star back to what the store last took, not to what the tap before
     * it asked for: when that earlier tap failed too, the store never left where it started. Two
     * taps on an unstarred card, both refused, leave it empty and say it is not a Favorite.
     */
    it("shows the store's state after every tap of a run failed", async () => {
        const writes = favorites();
        await open(makeCard({ id: "p1", is_favorite: false }));

        await tap(star());
        await tap(star());
        await act(async () => writes.calls[0]!.resolve({ ok: false, error: "No" }));
        await act(async () => writes.calls[1]!.resolve({ ok: false, error: "No" }));
        await act(flush);

        expect(star()).toHaveAttribute("aria-pressed", "false");
        expect(notifyMock.writeFailed).toHaveBeenCalledTimes(1);
        expect(notifyMock.writeFailed).toHaveBeenCalledWith("That card is not a Favorite", { ok: false, error: "No" });
    });
});

/*
 * The sheet a visitor opens from a set page: the card carries no holding (`SetCard.holding` is
 * null), so nobody was asked what they hold, and the sheet claims nothing about a collection.
 */
describe("CardDetailSlideout: a card nobody was asked about", () => {
    const visitor = async () => {
        pathname.current = "/sets/base1";
        const card = makeCard({ id: "c1", name: "Charizard", number: "4", printed_number: "4", owned: false, quantity: 0, tcg_id: "base1-4" });
        return open(card, {
            addable: { id: "c1", name: "Charizard", set: "Base Set", number: "4", holding: null, price: 823.98 } as never,
        });
    };

    it("says what an account keeps here instead of answering for a collection nobody read", async () => {
        await visitor();
        const dialog = screen.getByRole("dialog");
        expect(screen.getByRole("heading", { name: "Your copies" })).toBeInTheDocument();
        expect(dialog).not.toHaveTextContent("You do not hold this card yet");
        expect(dialog).toHaveTextContent("An account keeps your copies of this card here");
    });

    it("offers the two ways in as links to signing in, carrying the page", async () => {
        await visitor();
        const collection = screen.getByRole("link", { name: "Sign in to add Charizard #4 to your collection" });
        const wishlist = screen.getByRole("link", { name: "Sign in to put Charizard #4 on your wishlist" });
        expect(collection).toHaveAttribute("href", "/login?next=%2Fsets%2Fbase1");
        expect(wishlist).toHaveAttribute("href", "/login?next=%2Fsets%2Fbase1");
        // Links, not buttons: nothing here writes, and neither name is offered as one.
        expect(screen.queryByRole("button", { name: "Add to collection" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add to wishlist" })).not.toBeInTheDocument();
    });

    it("keeps the press on the way to signing in, with its target and the catalogue card, and lets the link go", async () => {
        const { keepPress } = await import("@/lib/keep-press-client");
        vi.mocked(keepPress).mockClear();
        await visitor();
        const collection = screen.getByRole("link", { name: "Sign in to add Charizard #4 to your collection" });
        // fireEvent returns false when a handler called preventDefault: true is a navigation let go.
        expect(fireEvent.click(collection)).toBe(true);
        expect(keepPress).toHaveBeenLastCalledWith("collection", expect.objectContaining({ id: "c1", name: "Charizard", set: "Base Set", number: "4" }));
        expect(collection).toHaveAttribute("href", "/login?next=%2Fsets%2Fbase1");

        const wishlist = screen.getByRole("link", { name: "Sign in to put Charizard #4 on your wishlist" });
        expect(fireEvent.click(wishlist)).toBe(true);
        expect(keepPress).toHaveBeenLastCalledWith("wishlist", expect.objectContaining({ name: "Charizard" }));
        expect(wishlist).toHaveAttribute("href", "/login?next=%2Fsets%2Fbase1");
        expect(keepPress).toHaveBeenCalledTimes(2);
    });

    it("reads nothing of anybody's: no binders, no facets, no copies", async () => {
        await visitor();
        expect(tryListBinders).not.toHaveBeenCalled();
        expect(loadFacets).not.toHaveBeenCalled();
        expect(listCopies).not.toHaveBeenCalled();
    });
    it("offers no way to take out a card that is in no collection", async () => {
        // The card arrives with an empty row rather than none, so the menu used to stand and
        // offer "Remove from collection" for it: a write that can only fail, to anybody.
        await visitor();
        expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
        expect(screen.queryByText("Remove from collection")).not.toBeInTheDocument();
    });
});
