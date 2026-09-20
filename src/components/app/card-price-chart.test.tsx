import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetCards, preloadPriceHistory } from "./card-memo";
import { CardPriceChart } from "./card-price-chart";

/*
 * The Price tab used to open on "No readings in this period yet" and change its mind half a
 * second later when the line landed, because the chart asked for the readings only once the tab
 * was on screen. The sheet now asks the moment it opens on a card, and the chart reads what was
 * learned; while nothing is known yet it holds the space and says nothing.
 */

const history = vi.fn();
/** The read that did not answer, as `@/lib/reads` has it; hoisted with the mock that uses it. */
const FAILED_READ = vi.hoisted(() => Symbol("read failed"));
vi.mock("@/lib/reads", () => ({
    // A line, or the failure where the test says the read did not answer.
    cardPriceHistory: (id: string) => Promise.resolve(history(id)).then((points: unknown) => (points === FAILED_READ ? FAILED_READ : { points, listings: {} })),
    isReadFailed: (a: unknown) => a === FAILED_READ,
}));

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
        forgetCards();
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
        const { container } = render(<CardPriceChart tcgId="sv1-2" period="1m" onPeriod={() => {}} />);
        expect(container.textContent).toBe("");
        expect(container.querySelector("[aria-busy]")).not.toBeNull();
        answer(two);
        await waitFor(() => expect(container.querySelector("svg[tabindex]")).not.toBeNull());
    });

    it("draws at once for a card whose line was read before the tab opened", async () => {
        history.mockResolvedValue(two);
        await preloadPriceHistory("sv1-3");
        const { container } = render(<CardPriceChart tcgId="sv1-3" period="1m" onPeriod={() => {}} />);
        expect(container.querySelector("svg[tabindex]")).not.toBeNull();
        expect(container.querySelector("[aria-busy]")).toBeNull();
    });

    /* A read that did not answer used to reach the chart as an empty line, and the chart told
       everybody the card had never been priced. It says which of the two it is now, and offers the
       one thing that can change it (error-path audit). */
    it("says the line could not be loaded, with a way to ask again, rather than that there are no readings", async () => {
        history.mockResolvedValue(FAILED_READ);
        const { container, getByRole } = render(<CardPriceChart tcgId="sv1-9" period="1m" onPeriod={() => {}} />);
        await waitFor(() => expect(container.textContent).toMatch(/could not be loaded/));
        expect(container.textContent).not.toMatch(/No readings/);

        // Said out loud, not only drawn: it arrives after the sheet is open, over a silent placeholder.
        expect(container.querySelector("output")).not.toBeNull();

        let answer: (p: typeof two) => void = () => {};
        history.mockReturnValue(new Promise((r) => (answer = r)));
        getByRole("button", { name: "Try again" }).click();
        // The button holds its place while the read is out, so the press does not drop the focus on it.
        await waitFor(() => expect(getByRole("button", { name: "Try again" })).toBeDisabled());
        answer(two);
        await waitFor(() => expect(container.querySelector("svg[tabindex]")).not.toBeNull());
    });

    it("keeps saying there are no readings for a card the API answers about with none", async () => {
        history.mockResolvedValue([]);
        const { container } = render(<CardPriceChart tcgId="sv1-10" period="1m" onPeriod={() => {}} />);
        await waitFor(() => expect(container.textContent).toMatch(/No readings/));
    });

    // Bart, 2026-09-15: the printing is chosen above the sheet, and the chart chooses only the period.
    it("draws the printing the sheet shows, and offers periods but no printings", async () => {
        const runs = [
            { date: "2026-09-10", market: 750, holo: 750, printings: { holofoil: 750, "shadowless-holofoil": 1850 } },
            { date: "2026-09-11", market: 752, holo: 752, printings: { holofoil: 752, "shadowless-holofoil": 1860 } },
        ];
        history.mockResolvedValue(runs);
        await preloadPriceHistory("base1-4");
        const { queryByRole, rerender, container } = render(
            <CardPriceChart tcgId="base1-4" name="Charizard" printing="holofoil" period="6m" onPeriod={() => {}} />,
        );
        expect(queryByRole("button", { name: "Shadowless Holo" })).toBeNull();
        expect(queryByRole("button", { name: "Max" })).not.toBeNull();
        rerender(<CardPriceChart tcgId="base1-4" name="Charizard" printing="shadowless-holofoil" period="6m" onPeriod={() => {}} />);
        await waitFor(() => expect(container.textContent).toMatch(/€1,850/));
    });
});
