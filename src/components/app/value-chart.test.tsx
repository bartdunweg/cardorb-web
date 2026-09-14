import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ValueChart } from "./value-chart";

/*
 * The card sheet's price line arrives after the chart has already drawn its empty state, since
 * the readings are fetched once the tab opens. The chart measures its width once, on mount, and
 * on that first pass there was no container to measure: the empty state has none. The readings
 * then came in, the periods appeared under a blank space, and the SVG never drew, because the
 * SVG is drawn only at a measured width. Somebody reported it as "the chart components load in
 * but I see no chart", which was exactly right.
 */

/** jsdom has no ResizeObserver; this one answers every observed box with one width, at once. */
class FakeResizeObserver {
    static width = 320;
    constructor(private cb: ResizeObserverCallback) {}
    observe = (el: Element) =>
        this.cb([{ target: el, contentRect: { width: FakeResizeObserver.width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    unobserve = vi.fn();
    disconnect = vi.fn();
}

const two = [
    { date: "2026-09-10", value: 2.4, cards: 1, priced: 1, unpriced: 0 },
    { date: "2026-09-11", value: 2.6, cards: 1, priced: 1, unpriced: 0 },
];

describe("ValueChart", () => {
    beforeEach(() => vi.stubGlobal("ResizeObserver", FakeResizeObserver));
    afterEach(() => vi.unstubAllGlobals());

    it("draws the line when the readings are there from the start", () => {
        const { container } = render(<ValueChart snapshots={two} />);
        expect(container.querySelector("svg[tabindex]")).not.toBeNull();
    });

    it("draws the line when the readings arrive after the empty state", () => {
        const { container, rerender } = render(<ValueChart snapshots={[]} />);
        expect(container.querySelector("svg[tabindex]")).toBeNull();
        rerender(<ValueChart snapshots={two} />);
        expect(container.querySelector("svg[tabindex]")).not.toBeNull();
    });

    // Bart, 2026-09-13: "ik zie het toevoegen van kaarten niet terug in de grafiek".
    it("rings the readings on which cards were added, and says so in the description", () => {
        const readings = [
            { date: "2026-09-09", value: 100, cards: 10, priced: 10, unpriced: 0, added: 4, addedValue: 30 },
            { date: "2026-09-10", value: 140, cards: 12, priced: 12, unpriced: 0, added: 2, addedValue: 35 },
            { date: "2026-09-11", value: 141, cards: 12, priced: 12, unpriced: 0, added: 0, addedValue: 0 },
        ];
        const { container, getByText } = render(<ValueChart snapshots={readings} />);
        // The first reading's additions came before what is shown: one ring, not two.
        expect(container.querySelectorAll("circle").length).toBe(1);
        expect(getByText(/Cards were added on 1 reading/)).toBeTruthy();
    });

    // Bart, 2026-09-14: a weekly point names its week, so a Tuesday's reading on a Saturday is not a lie.
    it("names the week of a weekly reading in the description", () => {
        const weeks = [
            { date: "2025-06-14", weekFrom: "2025-06-08", value: 2, cards: 1, priced: 1, unpriced: 0 },
            { date: "2025-06-21", weekFrom: "2025-06-15", value: 3, cards: 1, priced: 1, unpriced: 0 },
        ];
        const { getByText } = render(<ValueChart snapshots={weeks} countLabel={null} />);
        expect(getByText(/Jun 8\s*–\s*14, 2025 to .* on Jun 15\s*–\s*21, 2025/)).toBeTruthy();
    });
});
