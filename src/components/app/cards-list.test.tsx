import { Suspense } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Card, CardList } from "@/lib/cards";
import { CardsList } from "./cards-list";

/*
 * The wishlist's tiles carry "Got it", the one thing a wish can have done to it. The tile is a
 * button already, so the control has to stand beside it, not inside it: a button in a button is
 * not HTML, and a press on "Got it" must not open the sheet. What is checked here is that the
 * control appears on the wishlist and nowhere else, that it is its own focus stop with the card's
 * name in it, and that the tile's own press stays out of it.
 */

vi.mock("@/app/(app)/dashboard/list-actions", () => ({ loadMoreCards: vi.fn() }));
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({ markOwnedWith: vi.fn(), cardFacts: vi.fn().mockResolvedValue(null) }));
vi.mock("@/app/(app)/dashboard/collections/actions", () => ({ listCollections: vi.fn().mockResolvedValue([]) }));
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
        const gotIt = await screen.findByRole("button", { name: "Got it: Pikachu" });
        expect(gotIt).toBeInTheDocument();
        // Its own control, beside the tile: not inside the tile's button, and the tile not inside it.
        expect(gotIt.closest("button")).toBe(gotIt);
        expect(gotIt.parentElement?.closest("button")).toBeNull();
        expect(gotIt.querySelector("button")).toBeNull();
        expect(document.querySelectorAll("button button")).toHaveLength(0);
        // Two focus stops: the tile and the action.
        const buttons = screen.getAllByRole("button");
        expect(buttons).toHaveLength(2);
        expect(buttons.every((b) => b.tabIndex === 0)).toBe(true);
    });

    it("keeps the tile's own press out of Got it", async () => {
        const onSelect = await draw(true);
        const gotIt = await screen.findByRole("button", { name: "Got it: Pikachu" });
        fireEvent.click(gotIt);
        expect(onSelect).not.toHaveBeenCalled();
        // The form the sheet opens, not a second one.
        expect(await screen.findByRole("dialog")).toHaveTextContent("It leaves the wishlist and joins your collection.");
    });

    it("opens the sheet from the tile as before", async () => {
        const onSelect = await draw(true);
        await screen.findByRole("button", { name: "Got it: Pikachu" });
        const [tile] = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label") !== "Got it: Pikachu");
        fireEvent.click(tile!);
        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});

describe("CardsList elsewhere", () => {
    it("draws no Got it on the collection", async () => {
        await draw(false);
        expect(await screen.findAllByRole("button")).toHaveLength(1);
        expect(screen.queryByRole("button", { name: /Got it/ })).toBeNull();
    });
});
