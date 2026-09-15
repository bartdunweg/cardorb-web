import { fireEvent, render } from "@testing-library/react";
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
    // Bart, 2026-09-15: no ring on the line; the tooltip and the description say it.
    it("puts no ring on the readings on which cards were added, and says so in the description", () => {
        const readings = [
            { date: "2026-09-09", value: 100, cards: 10, priced: 10, unpriced: 0, added: 4, addedValue: 30 },
            { date: "2026-09-10", value: 140, cards: 12, priced: 12, unpriced: 0, added: 2, addedValue: 35 },
            { date: "2026-09-11", value: 141, cards: 12, priced: 12, unpriced: 0, added: 0, addedValue: 0 },
        ];
        const { container, getByText } = render(<ValueChart snapshots={readings} />);
        expect(container.querySelectorAll("circle").length).toBe(0);
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

    // Bart, 2026-09-15: one flowing line, no dotted stretch where nothing was read.
    it("draws one unbroken line across a stretch with no readings", () => {
        const readings = [
            { date: "2025-06-07", value: 2, cards: 1, priced: 1, unpriced: 0 },
            { date: "2025-06-14", value: 3, cards: 1, priced: 1, unpriced: 0 },
            { date: "2025-07-19", value: 4, cards: 1, priced: 1, unpriced: 0 },
        ];
        const { container, queryByText } = render(<ValueChart snapshots={readings} countLabel={null} />);
        expect(container.querySelectorAll("[stroke-dasharray]")).toHaveLength(0);
        expect(container.querySelectorAll("path[fill='none']")).toHaveLength(1);
        expect(queryByText(/drawn dotted/)).toBeNull();
    });

    // Bart, 2026-09-15: the highest and the lowest price are on the chart, not only under a hover.
    it("writes the highest and the lowest reading on the line, and in the description", () => {
        const readings = [
            { date: "2026-09-09", value: 120, cards: 1, priced: 1, unpriced: 0 },
            { date: "2026-09-10", value: 300, cards: 1, priced: 1, unpriced: 0 },
            { date: "2026-09-11", value: 90, cards: 1, priced: 1, unpriced: 0 },
            { date: "2026-09-12", value: 150, cards: 1, priced: 1, unpriced: 0 },
        ];
        const { container, getByText } = render(<ValueChart snapshots={readings} countLabel={null} />);
        const marks = [...container.querySelectorAll("text[data-extreme]")].map((t) => [t.getAttribute("data-extreme"), t.textContent]);
        expect(marks).toEqual([
            ["high", "€300.00"],
            ["low", "€90.00"],
        ]);
        expect(getByText(/Highest €300\.00 on Sep 10, 2026, lowest €90\.00 on Sep 11, 2026\./)).toBeTruthy();
    });

    it("writes one figure where the line never moves", () => {
        const { container } = render(<ValueChart snapshots={two.map((s) => ({ ...s, value: 2 }))} countLabel={null} />);
        expect(container.querySelectorAll("text[data-extreme]")).toHaveLength(1);
    });

    // Bart, 2026-09-15: "cards", not "copies", and "+1 card added".
    it("counts cards in the tooltip, one card in the singular", () => {
        const readings = [
            { date: "2026-09-09", value: 100, cards: 1, priced: 1, unpriced: 0 },
            { date: "2026-09-10", value: 140, cards: 2, priced: 2, unpriced: 0, added: 1, addedValue: 40 },
        ];
        const { container } = render(<ValueChart snapshots={readings} />);
        const svg = container.querySelector("svg[tabindex]")!;
        fireEvent.keyDown(svg, { key: "End" });
        expect(container.querySelector("output")?.textContent).toMatch(/2 cards\+1 card added, worth €40\.00/);
    });
});
