import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardPriceChart, forgetPriceHistory, preloadPriceHistory } from "./card-price-chart";

/*
 * The Price tab used to open on "No readings in this period yet" and change its mind half a
 * second later when the line landed, because the chart asked for the readings only once the tab
 * was on screen. The sheet now asks the moment it opens on a card, and the chart reads what was
 * learned; while nothing is known yet it holds the space and says nothing.
 */

const history = vi.fn();
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({ cardPriceHistory: (id: string) => history(id) }));

class FakeResizeObserver {
    constructor(private cb: ResizeObserverCallback) {}
    observe = (el: Element) => this.cb([{ target: el, contentRect: { width: 320 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    unobserve = vi.fn();
    disconnect = vi.fn();
}

const two = [
    { date: "2026-09-10", market: 2.4, holo: null },
    { date: "2026-09-11", market: 2.6, holo: null },
];

describe("CardPriceChart", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", FakeResizeObserver);
        forgetPriceHistory();
        history.mockReset();
    });
    afterEach(() => vi.unstubAllGlobals());

    it("asks once for a card, however many times it is asked about", async () => {
        history.mockResolvedValue(two);
        await Promise.all([preloadPriceHistory("sv1-1"), preloadPriceHistory("sv1-1")]);
        await preloadPriceHistory("sv1-1");
        expect(history).toHaveBeenCalledTimes(1);
    });

    it("holds the space, silent, until the readings are known", async () => {
        let answer: (p: typeof two) => void = () => {};
        history.mockReturnValue(new Promise((r) => (answer = r)));
        const { container } = render(<CardPriceChart tcgId="sv1-2" />);
        expect(container.textContent).toBe("");
        expect(container.querySelector("[aria-busy]")).not.toBeNull();
        answer(two);
        await waitFor(() => expect(container.querySelector("svg[tabindex]")).not.toBeNull());
    });

    it("draws at once for a card whose line was read before the tab opened", async () => {
        history.mockResolvedValue(two);
        await preloadPriceHistory("sv1-3");
        const { container } = render(<CardPriceChart tcgId="sv1-3" />);
        expect(container.querySelector("svg[tabindex]")).not.toBeNull();
        expect(container.querySelector("[aria-busy]")).toBeNull();
    });
});
