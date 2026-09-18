import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardsGrid } from "./cards-grid";

/*
 * A tile stepped to nought used to return nothing at once: it vanished under the pointer. It now
 * fades out first. The line under the title moves at the press, the tile is taken out when the
 * exit finishes (or is cancelled), and a count that comes back while it leaves keeps the tile.
 */

const totals = vi.fn();
vi.mock("@/components/app/list-totals", () => ({ useListTotals: () => totals }));
vi.mock("@/components/app/card-memo", () => ({ warmCard: vi.fn() }));
// The steps as the tile sees them: a count it can press, and the line told at the press.
vi.mock("@/components/app/use-copy-steps", () => ({
    useCopySteps: ({ held: page, onShown }: { held: number; onShown?: (from: number, to: number) => void }) => {
        const [held, setHeld] = useState(page);
        return {
            held,
            error: null,
            buttons: { current: null },
            press: (to: number) => {
                onShown?.(held, to);
                setHeld(to);
            },
        };
    },
}));

type FakeExit = { onfinish: (() => void) | null; oncancel: (() => void) | null; cancel: () => void; keyframes: Keyframe[] };
let exits: FakeExit[] = [];

beforeEach(() => {
    exits = [];
    totals.mockClear();
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    Element.prototype.animate = function (keyframes: Keyframe[]) {
        const exit: FakeExit = {
            keyframes,
            onfinish: null,
            oncancel: null,
            cancel() {
                exit.oncancel?.();
            },
        };
        exits.push(exit);
        return exit as unknown as Animation;
    } as never;
});
afterEach(() => {
    // @ts-expect-error jsdom has no animate of its own
    delete Element.prototype.animate;
    vi.unstubAllGlobals();
});

const card = (id: string, quantity = 1) => ({ id, name: `Card ${id}`, quantity, price: 2, owned: true }) as never;

describe("a tile leaving its list", () => {
    it("moves the line at the press and takes the tile out when the exit finishes", () => {
        render(<CardsGrid cards={[card("a")]} onSelect={() => {}} steps />);
        fireEvent.click(screen.getByRole("button", { name: "Remove Card a from your collection" }));

        expect(totals).toHaveBeenCalledWith({ copies: -1, value: -2, rows: -1 });
        expect(exits).toHaveLength(1);
        expect(exits[0]!.keyframes.at(-1)).toEqual({ opacity: 0, transform: "scale(0.96)" });
        expect(screen.getByText("Card a")).toBeInTheDocument();

        act(() => exits[0]!.onfinish?.());
        expect(screen.queryByText("Card a")).not.toBeInTheDocument();
    });

    it("takes the tile out when the exit is cancelled from outside", () => {
        render(<CardsGrid cards={[card("a")]} onSelect={() => {}} steps />);
        fireEvent.click(screen.getByRole("button", { name: "Remove Card a from your collection" }));
        act(() => exits[0]!.cancel());
        expect(screen.queryByText("Card a")).not.toBeInTheDocument();
    });

    it("keeps the tile when its count comes back while it leaves", () => {
        render(<CardsGrid cards={[card("a")]} onSelect={() => {}} steps />);
        fireEvent.click(screen.getByRole("button", { name: "Remove Card a from your collection" }));
        fireEvent.click(screen.getByRole("button", { name: "Add a copy of Card a" }));

        // The exit was cancelled by the tile itself, and that cancel removes nothing.
        expect(screen.getByText("Card a")).toBeInTheDocument();
        act(() => exits[0]!.onfinish?.());
        expect(screen.getByText("Card a")).toBeInTheDocument();
    });

    it("fades without the shrink under reduced motion", () => {
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        render(<CardsGrid cards={[card("a")]} onSelect={() => {}} steps />);
        fireEvent.click(screen.getByRole("button", { name: "Remove Card a from your collection" }));
        expect(exits[0]!.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    });
});

describe("the wave a grid's tiles arrive in", () => {
    const delays = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>(".arrive")].map((el) => el.style.getPropertyValue("--arrive-delay"));

    it("staggers the first page and lets a batch appended on scroll arrive at once", () => {
        const first = Array.from({ length: 10 }, (_, i) => card(`f${i}`));
        const { container, rerender } = render(<CardsGrid cards={first} onSelect={() => {}} />);
        expect(delays(container)[0]).toBe("0ms");
        expect(delays(container)[2]).toBe("calc(2 * var(--stagger-step))");
        expect(delays(container)[9]).toBe("calc(8 * var(--stagger-step))");

        rerender(<CardsGrid cards={[...first, card("n0"), card("n1")]} onSelect={() => {}} />);
        expect(delays(container).slice(10)).toEqual(["0ms", "0ms"]);
    });

    it("lets a card read again under a new row id arrive at once, even high on the page", () => {
        const { container, rerender } = render(<CardsGrid cards={[card("a"), card("b"), card("c")]} onSelect={() => {}} />);
        rerender(<CardsGrid cards={[card("a"), card("b2"), card("c")]} onSelect={() => {}} />);
        expect(delays(container)).toEqual(["0ms", "0ms", "calc(2 * var(--stagger-step))"]);
    });
});

/*
 * The count follows the price on its line, never against the right edge: the right end is the
 * buttons', which stand beside the price where the tile is wide enough (Bart's call, 2026-09-18).
 * It used to sit against the right edge, and hung there alone where there was no price.
 */
describe("where the count sits on a tile", () => {
    /** The count on the tile's last line: the innermost span whose words end in it. */
    const count = (c: unknown) => {
        const { container } = render(<CardsGrid cards={[c] as never} onSelect={() => {}} />);
        return [...container.querySelectorAll("span")].filter((el) => /\u00d71$/.test(el.textContent ?? "")).at(-1)!;
    };

    it("follows the price, with or without one", () => {
        expect(count(card("a")).className).not.toContain("ml-auto");
        expect(count({ id: "b", name: "Card b", quantity: 1, price: null, owned: true }).className).not.toContain("ml-auto");
    });
});
