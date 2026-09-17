import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SetCard } from "@/lib/api-shapes";
import { SetCardTile } from "./set-card-tile";

/*
 * The heart under a set tile is drawn anew when it fills or empties. A keyboard on it lost its
 * place and started again at the top of the page; it stays on the heart now, both ways.
 */

vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    addCard: vi.fn().mockResolvedValue({ ok: true, id: "4f0c1b2a-5d6e-4f70-8a9b-0c1d2e3f4a5b" }),
    removeCard: vi.fn().mockResolvedValue({ ok: true }),
    restoreCard: vi.fn(),
    setCopies: vi.fn(),
    rereadMine: vi.fn(),
    markOwnedWith: vi.fn(),
}));
vi.mock("@/lib/reads", () => ({ cardFacts: vi.fn().mockResolvedValue(null), listBinders: vi.fn().mockResolvedValue([]) }));
vi.mock("@/components/app/card-memo", () => ({ warmCard: vi.fn() }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/app/toast", () => ({ notify: { done: vi.fn(), removed: vi.fn(), failed: vi.fn(), dismiss: vi.fn() } }));
vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

const card: SetCard = {
    id: "me03-001",
    number: "001",
    name: "Spinarak",
    localName: null,
    setName: "Perfect Order",
    setAbbr: "POR",
    rarity: "Common",
    category: null,
    trainerType: null,
    types: [],
    imageUrl: null,
    imageHighUrl: null,
    owned: false,
    wishlist: false,
    quantity: 0,
    itemIds: [],
    price: 0.06,
    tcgId: "me03-001",
};

describe("SetCardTile's heart", () => {
    it("keeps keyboard focus on the heart as it fills and as it empties", async () => {
        render(<SetCardTile card={card} />);
        const add = screen.getByRole("button", { name: "Add Spinarak #001 to your wishlist" });
        add.focus();
        await act(async () => {
            fireEvent.click(add);
            await new Promise((r) => requestAnimationFrame(r));
        });
        const remove = screen.getByRole("button", { name: "Remove Spinarak #001 from your wishlist" });
        expect(document.activeElement).toBe(remove);

        await act(async () => {
            fireEvent.click(remove);
            await new Promise((r) => requestAnimationFrame(r));
        });
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add Spinarak #001 to your wishlist" }));
    });
});

/*
 * Undo on "in your collection now" removed the row and left the tile saying the card was yours: the
 * page drawn after the undo holds what it held before the add, so the tile kept the count it pressed,
 * and a minus then wrote to a row that was gone.
 */
describe("SetCardTile's Undo after an add", () => {
    it("takes the tile back at once, removes the row quietly and reads the page again", async () => {
        const { removeCard } = await import("@/app/(app)/dashboard/cards/actions");
        const { notify } = await import("@/components/app/toast");
        vi.mocked(removeCard).mockClear();
        vi.mocked(notify.done).mockClear();
        refresh.mockClear();
        render(<SetCardTile card={card} />);

        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add Spinarak #001 to your collection" })));
        await act(async () => new Promise((r) => setTimeout(r, 0)));
        expect(screen.getByRole("button", { name: "Remove Spinarak #001 from your collection" })).toBeInTheDocument();
        const [, options] = vi.mocked(notify.done).mock.calls.find(([title]) => title === "Spinarak is in your collection now")!;

        act(() => options!.undo!.onUndo());
        // At once, before the store answers.
        expect(screen.getByRole("button", { name: "Add Spinarak #001 to your collection" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Remove Spinarak #001 from your collection/ })).toBeNull();
        expect(screen.getByRole("button", { name: "Spinarak #001, not in your collection" })).toBeInTheDocument();

        await act(async () => new Promise((r) => setTimeout(r, 0)));
        expect(removeCard).toHaveBeenCalledWith("4f0c1b2a-5d6e-4f70-8a9b-0c1d2e3f4a5b", { reread: false });
        expect(notify.done).toHaveBeenCalledWith("Undone");
        expect(refresh).toHaveBeenCalled();
    });
});
