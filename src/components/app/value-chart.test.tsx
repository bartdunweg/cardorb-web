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
});
