import { Suspense } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Card, CardList } from "@/lib/cards";
import { CardsList, runKey, setGroups } from "./cards-list";

/*
 * The wishlist's tiles carry "Got it", the one thing a wish can have done to it. The tile is a
 * button already, so the control has to stand beside it, not inside it: a button in a button is
 * not HTML, and a press on "Got it" must not open the sheet. What is checked here is that the
 * control appears on the wishlist and nowhere else, that it is its own focus stop with the card's
 * name in it, and that the tile's own press stays out of it.
 */

vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    markOwnedWith: vi.fn(),
}));
vi.mock("@/lib/reads", () => ({
    cardFacts: vi.fn().mockResolvedValue(null),
    cardFactsMany: vi.fn().mockResolvedValue({}),
    listBinders: vi.fn().mockResolvedValue([]),
    loadMoreCards: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// jsdom has no matchMedia; the Got it form's date picker reads the breakpoint through it.
vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));

const card: Card = {
    id: "9b2f4d1e-3c5a-4e7b-8f90-1a2b3c4d5e6f",
    name: "Pikachu",
    set_name: "Base",
    set_abbr: "BS",
    set: "base1",
    number: "58",
    rarity: "Common",
    gen: null,
    types: null,
    quantity: null,
    owned: false,
    is_favorite: false,
    excluded: false,
    condition: null,
    grade: null,
    language: "en",
    finish: null,
    foil_pattern: null,
    purchase_price: null,
    purchase_date: null,
    acquired_at: null,
    notes: null,
    price: 1.5,
    image_url: null,
    image_high_url: null,
    tcg_id: null,
} as Card;

const list = Promise.resolve({
    cards: [card],
    total: 1,
    copies: null,
    value: null,
    unpriced: 0,
    catalogueUnavailable: false,
    facets: { sets: [], rarities: [], gens: [], types: [] },
} as unknown as CardList);

const draw = async (wishlist: boolean, onSelect = vi.fn()) => {
    // The list is a promise the component reads with `use`, so the first render suspends on it:
    // an awaited act lets React take the answer before anything is looked for.
    await act(async () =>
        render(
            <Suspense fallback={null}>
                <CardsList
                    list={list}
                    filter={wishlist ? { wishlist: true } : {}}
                    narrowed={false}
                    view="grid"
                    size="md"
                    onSelect={onSelect}
                    noHits={null}
                    empty={null}
                />
            </Suspense>,
        ),
    );
    return onSelect;
};

describe("CardsList on the wishlist", () => {
    it("draws Got it on each tile, named after the card", async () => {
        await draw(true);
        const gotIt = await screen.findByRole("button", { name: "Add Pikachu to your collection" });
        expect(gotIt).toBeInTheDocument();
        // Its own control, beside the tile: not inside the tile's button, and the tile not inside it.
        expect(gotIt.closest("button")).toBe(gotIt);
        expect(gotIt.parentElement?.closest("button")).toBeNull();
        expect(gotIt.querySelector("button")).toBeNull();
        expect(document.querySelectorAll("button button")).toHaveLength(0);
        // Three focus stops: the tile, the heart that takes it off the wishlist, and Got it.
        expect(screen.getByRole("button", { name: "Remove Pikachu from your wishlist" })).toHaveAttribute("aria-pressed", "true");
        const buttons = screen.getAllByRole("button");
        expect(buttons).toHaveLength(3);
        expect(buttons.every((b) => b.tabIndex === 0)).toBe(true);
    });

    it("keeps the tile's own press out of Got it", async () => {
        const onSelect = await draw(true);
        const gotIt = await screen.findByRole("button", { name: "Add Pikachu to your collection" });
        fireEvent.click(gotIt);
        expect(onSelect).not.toHaveBeenCalled();
        // The form the sheet opens, not a second one. It loads when the dialog opens: the dialog is
        // there at once, named after the card, with focus in it, and the form follows.
        const dialog = await screen.findByRole("dialog", { name: "Pikachu" });
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await waitFor(() => expect(dialog).toHaveTextContent("It leaves the wishlist and joins your collection."));
    });

    it("opens the sheet from the tile as before", async () => {
        const onSelect = await draw(true);
        await screen.findByRole("button", { name: "Add Pikachu to your collection" });
        const [tile] = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label") !== "Add Pikachu to your collection");
        fireEvent.click(tile!);
        expect(onSelect).toHaveBeenCalledTimes(1);
        // With the list it was picked from, which the tile reads at the press rather than when it was drawn.
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: card.id }), [expect.objectContaining({ id: card.id })]);
    });
});

describe("CardsList elsewhere", () => {
    it("draws no Got it on the collection", async () => {
        await draw(false);
        expect(await screen.findAllByRole("button")).toHaveLength(1);
        expect(screen.queryByRole("button", { name: /to your collection/ })).toBeNull();
    });

    // A card you hold has the minus and the plus a set tile has, beside the tile and not in it.
    it("draws a minus and a plus under a card you hold", async () => {
        const held = { ...card, id: "0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", owned: true, quantity: 1 } as Card;
        await act(async () =>
            render(
                <Suspense fallback={null}>
                    <CardsList
                        list={Promise.resolve({ cards: [held], total: 1, facets: { sets: [], rarities: [], gens: [], types: [] } } as unknown as CardList)}
                        filter={{}}
                        narrowed={false}
                        view="grid"
                        size="md"
                        onSelect={vi.fn()}
                        noHits={null}
                        empty={null}
                    />
                </Suspense>,
            ),
        );
        expect(await screen.findByRole("button", { name: "Remove Pikachu from your collection" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add a copy of Pikachu" })).toBeInTheDocument();
        expect(document.querySelectorAll("button button")).toHaveLength(0);
    });
});

/*
 * A card the reader has just written off this very list (a star turned off on Favorites) is gone
 * from it on the press. The list is read again after such a write, and until that read lands, or
 * where it never lands because the read answers from a cache that has not caught up with the write,
 * the card sat there as if nothing had happened, until a reload.
 */
describe("CardsList with cards written off the list", () => {
    const of = (id: string, name: string): Card => ({ ...card, id, name, owned: true, quantity: 1 });
    const two = [of("a", "Pikachu"), of("b", "Raichu")];
    const drawWith = async (gone: ReadonlySet<string>, cards = two) =>
        act(async () =>
            render(
                <Suspense fallback={null}>
                    <CardsList
                        list={Promise.resolve({ cards, total: cards.length, facets: { sets: [], rarities: [], gens: [], types: [] } } as unknown as CardList)}
                        filter={{}}
                        narrowed={false}
                        view="grid"
                        size="md"
                        onSelect={vi.fn()}
                        noHits={null}
                        empty={<p>No favorites yet</p>}
                        gone={gone}
                    />
                </Suspense>,
            ),
        );

    it("leaves the card out, and out of the count it says", async () => {
        await drawWith(new Set(["b"]));
        expect(await screen.findByText("Pikachu")).toBeInTheDocument();
        expect(screen.queryByText("Raichu")).toBeNull();
        expect(screen.getByText("Showing 1 of 1 cards")).toBeInTheDocument();
    });

    it("draws the list as it was when nothing was written off it", async () => {
        await drawWith(new Set());
        expect(await screen.findByText("Pikachu")).toBeInTheDocument();
        expect(screen.getByText("Raichu")).toBeInTheDocument();
    });

    it("shows the empty state once the last card has gone", async () => {
        await drawWith(new Set(["a", "b"]));
        expect(await screen.findByText("No favorites yet")).toBeInTheDocument();
        expect(screen.queryByText("Pikachu")).toBeNull();
    });
});

/*
 * "Set" asks the API for nothing, because the order it answers in is set by set already. That
 * grouping was on screen and unnamed, so the list read as unsorted. These are the runs the
 * headings are drawn from: one per set, in the order the list arrived, never a group-by that
 * could reorder it.
 */
describe("the runs a set heading is drawn over", () => {
    const of = (id: string, set: string | null): Card => ({ ...card, id, set_name: set });

    it("keeps the whole list in one unnamed run when the sort is not Set", () => {
        const cards = [of("a", "Jungle"), of("b", "Fossil")];
        expect(setGroups(cards, false)).toEqual([{ name: null, cards }]);
    });

    it("opens a run per set, in the order the list arrived", () => {
        const groups = setGroups([of("a", "Jungle"), of("b", "Jungle"), of("c", "Fossil")], true);
        expect(groups.map((g) => [g.name, g.cards.length])).toEqual([
            ["Jungle", 2],
            ["Fossil", 1],
        ]);
    });

    it("keeps a card the catalogue could not name in the run above it, rather than under a blank heading", () => {
        const groups = setGroups([of("a", "Jungle"), of("b", null), of("c", "Fossil")], true);
        expect(groups.map((g) => [g.name, g.cards.map((c) => c.id)])).toEqual([
            ["Jungle", ["a", "b"]],
            ["Fossil", ["c"]],
        ]);
    });

    it("gives an unnamed first card a run of its own rather than dropping it", () => {
        expect(setGroups([of("a", null), of("b", "Jungle")], true).map((g) => g.name)).toEqual([null, "Jungle"]);
    });
});

/*
 * A list stops when the API says it has nothing more, not when the first page's count is reached.
 * That count can be minutes old, and a list still short of it asked for an empty batch, drew the
 * skeleton under the last card and asked again, for as long as the page was open.
 */
describe("CardsList at the end of a list", () => {
    const of = (id: string): Card => ({ ...card, id, name: `Card ${id}` });
    const page = (cards: Card[], total: number) =>
        Promise.resolve({
            cards,
            total,
            copies: null,
            value: null,
            unpriced: 0,
            catalogueUnavailable: false,
            facets: { sets: [], rarities: [], gens: [], types: [] },
        } as unknown as CardList);

    // An observer that sees the sentinel as soon as it watches it: the reader is at the bottom.
    class Seen {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe() {
            queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
        }
        disconnect() {}
    }

    const scrollToEnd = async (first: Promise<CardList>) => {
        vi.stubGlobal("IntersectionObserver", Seen);
        await act(async () =>
            render(
                <Suspense fallback={null}>
                    <CardsList list={first} filter={{}} narrowed={false} view="grid" size="md" onSelect={vi.fn()} noHits={null} empty={null} />
                </Suspense>,
            ),
        );
        for (let i = 0; i < 10; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
        vi.unstubAllGlobals();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    };

    it("stops on the count a batch answers when the first page's count was stale", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        load.mockResolvedValueOnce({ cards: [of("c")], total: 3 }).mockResolvedValue({ cards: [], total: 3 });
        await scrollToEnd(page([of("a"), of("b")], 4));
        expect(load).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("button", { name: /Show more|Loading/ })).toBeNull();
        expect(document.querySelector("[aria-live]")).toHaveTextContent("Showing 3 of 3 cards");
    });

    it("moves past a repeat rather than asking for the same rows again", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        load.mockResolvedValue({ cards: [of("b")], total: 3 });
        await scrollToEnd(page([of("a"), of("b")], 3));
        expect(load).toHaveBeenCalledTimes(1);
        expect(load).toHaveBeenCalledWith(expect.objectContaining({ offset: 2 }));
        expect(screen.queryByRole("button", { name: /Show more|Loading/ })).toBeNull();
        expect(document.querySelector("[aria-live]")).toHaveTextContent("Showing 2 of 2 cards");
    });
});

/*
 * The page read again after a write (the sheet's refresh, a copy saved, a wish put back) hands this
 * same list a new first page. It used to throw away every batch scrolling had appended: a reader
 * far down was dropped back to the first batch and the list read itself in again, which is the grid
 * "refreshing". The scrolled cards stay, and the span behind the first page is read again.
 */
describe("CardsList when its first page is read again", () => {
    const of = (id: string): Card => ({ ...card, id, name: `Card ${id}` });
    // Already settled, as a promise the router hands over after a refresh is by the time it commits:
    // `use` then reads it without suspending, as it does inside the refresh's transition.
    const settled = (cards: Card[], total: number) =>
        Object.assign(Promise.resolve({ cards, total, facets: { sets: [], rarities: [], gens: [], types: [] } } as unknown as CardList), {
            status: "fulfilled",
            value: { cards, total, facets: { sets: [], rarities: [], gens: [], types: [] } },
        }) as unknown as Promise<CardList>;

    class Seen {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe() {
            queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
        }
        disconnect() {}
    }
    const settle = async () => {
        for (let i = 0; i < 10; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    };
    const names = () => [...document.querySelectorAll("[aria-live]")].map((n) => n.textContent);

    it("keeps the scrolled cards and drops one removed further down", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        // Scrolling: the second batch, and then the list is whole.
        load.mockResolvedValueOnce({ cards: [of("c"), of("d")], total: 4 });
        vi.stubGlobal("IntersectionObserver", Seen);
        const at = (list: Promise<CardList>) => (
            <Suspense fallback={<p>skeleton</p>}>
                <CardsList
                    list={list}
                    listKey="/dashboard/cards"
                    filter={{}}
                    narrowed={false}
                    view="grid"
                    size="md"
                    onSelect={vi.fn()}
                    noHits={null}
                    empty={null}
                />
            </Suspense>
        );
        const view = await act(async () => render(at(settled([of("a"), of("b")], 4))));
        await settle();
        expect(names()).toEqual(["Showing 4 of 4 cards"]);

        // A write removed "c"; the refresh hands a new first page, and the span after it reads "d" alone.
        load.mockReset();
        let answer: (value: { cards: Card[]; total: number }) => void = () => {};
        load.mockReturnValue(new Promise((resolve) => (answer = resolve)));
        await act(async () => view.rerender(at(settled([of("a"), of("b")], 3))));
        // Before the re-read lands, the scrolled cards are still drawn: nothing went back to the first batch.
        expect(screen.queryByText("skeleton")).toBeNull();
        expect(screen.getByText("Card c")).toBeInTheDocument();
        expect(screen.getByText("Card d")).toBeInTheDocument();
        await act(async () => answer({ cards: [of("d")], total: 3 }));
        await settle();
        vi.unstubAllGlobals();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));

        expect(load).toHaveBeenCalledTimes(1);
        expect(load).toHaveBeenCalledWith(expect.objectContaining({ offset: 2 }));
        expect(screen.queryByText("Card c")).toBeNull();
        expect(screen.getByText("Card d")).toBeInTheDocument();
        expect(names()).toEqual(["Showing 3 of 3 cards"]);
    });

    it("keeps a batch that landed while the first page was read again", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        const all = ["a", "b", "c", "d", "e", "f"].map(of);
        // Two cards a batch unless the list asks for a span; the rows as the API holds them.
        const slice = (f: unknown) => {
            const { offset, limit } = f as { offset: number; limit?: number };
            return { cards: all.slice(offset, offset + (limit ?? 2)), total: all.length };
        };
        let landBatch: () => void = () => {};
        load.mockImplementation(async (f) => {
            const { offset } = f as { offset: number };
            // The third batch is on its way when the refresh comes, and lands when the test says.
            if (offset === 4 && load.mock.calls.length === 2) await new Promise<void>((resolve) => (landBatch = resolve));
            // The re-read is slower than the batch, which is how the batch landed first.
            else if (load.mock.calls.length > 2) await new Promise((resolve) => setTimeout(resolve, 20));
            return slice(f);
        });
        vi.stubGlobal("IntersectionObserver", Seen);
        const at = (list: Promise<CardList>) => (
            <Suspense fallback={null}>
                <CardsList
                    list={list}
                    listKey="/dashboard/cards"
                    filter={{}}
                    narrowed={false}
                    view="grid"
                    size="md"
                    onSelect={vi.fn()}
                    noHits={null}
                    empty={null}
                />
            </Suspense>
        );
        const view = await act(async () => render(at(settled(all.slice(0, 2), 6))));
        await settle();
        expect(screen.getByText("Card d")).toBeInTheDocument();
        expect(load).toHaveBeenCalledTimes(2);

        await act(async () => view.rerender(at(settled(all.slice(0, 2), 6))));
        await act(async () => landBatch());
        await act(async () => new Promise((resolve) => setTimeout(resolve, 60)));
        await settle();
        vi.unstubAllGlobals();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));

        for (const id of ["a", "b", "c", "d", "e", "f"]) expect(screen.getByText(`Card ${id}`)).toBeInTheDocument();
        expect(names()).toEqual(["Showing 6 of 6 cards"]);
    });

    it("reads the scrolled span again in one request, with Show more waiting on it", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        const all = ["a", "b", "c", "d", "e", "f", "g", "h"].map(of);
        load.mockImplementation(async (f) => {
            const { offset, limit } = f as { offset: number; limit?: number };
            return { cards: all.slice(offset, offset + (limit ?? 2)), total: all.length };
        });
        // No observer: the reader presses Show more, twice.
        const at = (list: Promise<CardList>) => (
            <Suspense fallback={null}>
                <CardsList
                    list={list}
                    listKey="/dashboard/cards"
                    filter={{}}
                    narrowed={false}
                    view="grid"
                    size="md"
                    onSelect={vi.fn()}
                    noHits={null}
                    empty={null}
                />
            </Suspense>
        );
        const view = await act(async () => render(at(settled(all.slice(0, 2), 8))));
        for (let i = 0; i < 2; i++) {
            await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show more" })));
            await settle();
        }
        expect(names()).toEqual(["Showing 6 of 8 cards"]);

        load.mockClear();
        let answer: () => void = () => {};
        load.mockImplementation(async (f) => {
            await new Promise<void>((resolve) => (answer = resolve));
            const { offset, limit } = f as { offset: number; limit?: number };
            return { cards: all.slice(offset, offset + (limit ?? 2)), total: all.length };
        });
        await act(async () => view.rerender(at(settled(all.slice(0, 2), 8))));
        await settle();
        // While the span is read again the button waits, and a press on it asks for nothing more.
        const button = screen.getByRole("button", { name: "Show more" });
        expect(button).toHaveAttribute("aria-disabled", "true");
        await act(async () => fireEvent.click(button));
        // The region keeps the count: no card is being added.
        expect(names()).toEqual(["Showing 6 of 8 cards"]);
        await act(async () => answer());
        await settle();

        expect(load).toHaveBeenCalledTimes(1);
        expect(load).toHaveBeenCalledWith(expect.objectContaining({ offset: 2, limit: 4 }));
        expect(screen.getByRole("button", { name: "Show more" })).not.toHaveAttribute("aria-disabled");
        expect(screen.getByText("Card f")).toBeInTheDocument();
    });
});

describe("the key a set's run is drawn under", () => {
    it("stays with the run when a run above it goes", () => {
        const before = [{ name: "Jungle" }, { name: "Fossil" }, { name: "Base" }];
        const after = [{ name: "Fossil" }, { name: "Base" }];
        expect(runKey(after, 0)).toBe(runKey(before, 1));
        expect(runKey(after, 1)).toBe(runKey(before, 2));
    });

    it("tells apart two runs of one name", () => {
        const groups = [{ name: "Base" }, { name: "Jungle" }, { name: "Base" }];
        expect(runKey(groups, 0)).not.toBe(runKey(groups, 2));
    });
});

/*
 * The grid is drawn once per set, so a tile's place restarted in every set and the first six tiles
 * of every set, in every batch, were fetched ahead of everything else. Only the first set's first
 * row is at the top of the page; everything under it loads as it scrolls in.
 */
describe("the tiles fetched first", () => {
    const of = (id: string, set: string): Card => ({ ...card, id, name: `Card ${id}`, set_name: set, image_url: `https://images.cardorb.com/${id}.png` });
    const eager = () => [...document.querySelectorAll("img")].filter((img) => img.getAttribute("loading") !== "lazy");

    it("are the first set's first row, and no other set's", async () => {
        const cards = [...Array.from({ length: 7 }, (_, i) => of(`a${i}`, "Jungle")), ...Array.from({ length: 7 }, (_, i) => of(`b${i}`, "Fossil"))];
        await act(async () =>
            render(
                <Suspense fallback={null}>
                    <CardsList
                        list={Promise.resolve({ cards, total: cards.length, facets: { sets: [], rarities: [], gens: [], types: [] } } as unknown as CardList)}
                        filter={{}}
                        narrowed={false}
                        view="grid"
                        size="md"
                        groupedBySet
                        onSelect={vi.fn()}
                        noHits={null}
                        empty={null}
                    />
                </Suspense>,
            ),
        );
        expect(document.querySelectorAll("img")).toHaveLength(14);
        expect(eager()).toHaveLength(6);
        const [jungle] = document.querySelectorAll("section");
        expect(eager().every((img) => jungle!.contains(img))).toBe(true);
    });

    it("are never in a batch appended on scroll", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        load.mockResolvedValueOnce({ cards: [of("c", "Base"), of("d", "Base")], total: 4 });
        class Seen {
            constructor(private readonly callback: IntersectionObserverCallback) {}
            observe() {
                queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
            }
            disconnect() {}
        }
        vi.stubGlobal("IntersectionObserver", Seen);
        await act(async () =>
            render(
                <Suspense fallback={null}>
                    <CardsList
                        list={Promise.resolve({
                            cards: [of("a", "Base"), of("b", "Base")],
                            total: 4,
                            facets: { sets: [], rarities: [], gens: [], types: [] },
                        } as unknown as CardList)}
                        filter={{}}
                        narrowed={false}
                        view="grid"
                        size="md"
                        onSelect={vi.fn()}
                        noHits={null}
                        empty={null}
                    />
                </Suspense>,
            ),
        );
        for (let i = 0; i < 10; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
        vi.unstubAllGlobals();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        expect(document.querySelectorAll("img")).toHaveLength(4);
        expect(eager().map((img) => img.getAttribute("src"))).toEqual([expect.stringContaining("a.png"), expect.stringContaining("b.png")]);
    });
});

/*
 * The list is drawn as one grid per set, so a scroll batch that starts a set brings in a grid of
 * its own. Its tiles are not the page's first and must not wave in; the first page still does.
 */
describe("the wave the list's tiles arrive in", () => {
    const of = (id: string, set: string): Card => ({ ...card, id, name: `Card ${id}`, set_name: set });
    const delays = (section: Element) => [...section.querySelectorAll<HTMLElement>(".arrive")].map((el) => el.style.getPropertyValue("--arrive-delay"));

    it("staggers only the first page, not a set a scroll batch starts", async () => {
        const { loadMoreCards } = await import("@/lib/reads");
        const load = vi.mocked(loadMoreCards);
        load.mockReset();
        load.mockResolvedValueOnce({ cards: [of("c", "Fossil"), of("d", "Fossil"), of("e", "Fossil")], total: 5 });
        class Seen {
            constructor(private readonly callback: IntersectionObserverCallback) {}
            observe() {
                queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
            }
            disconnect() {}
        }
        vi.stubGlobal("IntersectionObserver", Seen);
        await act(async () =>
            render(
                <Suspense fallback={null}>
                    <CardsList
                        list={Promise.resolve({
                            cards: [of("a", "Jungle"), of("b", "Jungle")],
                            total: 5,
                            facets: { sets: [], rarities: [], gens: [], types: [] },
                        } as unknown as CardList)}
                        filter={{}}
                        narrowed={false}
                        view="grid"
                        size="md"
                        groupedBySet
                        onSelect={vi.fn()}
                        noHits={null}
                        empty={null}
                    />
                </Suspense>,
            ),
        );
        for (let i = 0; i < 10; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
        vi.unstubAllGlobals();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        const [jungle, fossil] = document.querySelectorAll("section");
        expect(delays(jungle!)).toEqual(["0ms", "calc(1 * var(--stagger-step))"]);
        expect(fossil).toBeDefined();
        expect(delays(fossil!)).toEqual(["0ms", "0ms", "0ms"]);
    });
});
