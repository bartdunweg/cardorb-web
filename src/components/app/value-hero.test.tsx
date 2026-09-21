import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ValueHero } from "./value-hero";

/** jsdom has no ResizeObserver; the chart needs one to measure itself. */
class FakeResizeObserver {
    constructor(private cb: ResizeObserverCallback) {}
    observe = (el: Element) => this.cb([{ target: el, contentRect: { width: 400 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    unobserve = vi.fn();
    disconnect = vi.fn();
}

const reading = (date: string, value: number) => ({ date, value, cards: 2265, priced: 2265, unpriced: 0 });
/** Every day from `first` to today, so a history can be as long as a test needs it. */
const daily = (first: string, value: (i: number) => number) => {
    const out = [];
    for (let d = new Date(`${first}T12:00:00`); d <= new Date("2026-09-21T12:00:00"); d.setDate(d.getDate() + 1)) {
        out.push(reading(d.toLocaleDateString("en-CA"), value(out.length)));
    }
    return out;
};

describe("ValueHero's change sentence", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", FakeResizeObserver);
        vi.useFakeTimers({ now: new Date("2026-09-21T12:00:00"), toFake: ["Date"] });
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    // Bart, 2026-09-21: twelve days of readings said "in the last 30 days" over a figure that was not.
    it("measures from the first reading, and says so, where the history is shorter than the period", () => {
        render(<ValueHero name="Collection" selected="all" value={8089} snapshots={daily("2026-09-09", (i) => 7761 + i * 20)} />);
        expect(screen.getByText(/since the first reading/)).toBeTruthy();
        expect(screen.queryByText(/in the last 30 days/)).toBeNull();
    });

    // The period it names is the period, and the figure beside it is unchanged either way.
    it("names the month where the readings fill it", () => {
        render(<ValueHero name="Collection" selected="all" value={8089} snapshots={daily("2026-06-01", (i) => 7000 + i)} />);
        expect(screen.getByText(/in the last 30 days/)).toBeTruthy();
        expect(screen.queryByText(/since the first reading/)).toBeNull();
    });
});
