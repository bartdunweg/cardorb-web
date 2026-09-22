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

const TODAY = "2026-09-21T12:00:00";
const reading = (date: string, value: number) => ({ date, value, cards: 2265, priced: 2265, unpriced: 0 });
/** A reading every day from `first` up to today, oldest first, as the API answers. */
const daily = (first: string, value: (i: number) => number) => {
    const out = [];
    for (const d = new Date(`${first}T12:00:00`); d <= new Date(TODAY); d.setDate(d.getDate() + 1)) {
        out.push(reading(d.toLocaleDateString("en-CA"), value(out.length)));
    }
    return out;
};

describe("ValueHero's change sentence", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", FakeResizeObserver);
        vi.useFakeTimers({ now: new Date(TODAY), toFake: ["Date"] });
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    const hero = (snapshots: ReturnType<typeof daily>) => render(<ValueHero name="Collection" selected="all" value={8089} snapshots={snapshots} />);

    // Bart, 2026-09-21: seven days of readings said "in the last 30 days" over a figure that was not.
    it("measures from the first reading, and says so, where the line is shorter than the period", () => {
        hero(daily("2026-09-15", (i) => 7761 + i * 20));
        expect(screen.getByText(/since the first reading/)).toBeTruthy();
        expect(screen.queryByText(/in the last 30 days/)).toBeNull();
    });

    /*
     * The other half of the same rule. A copy counts from the day it was acquired, which the owner
     * sets by hand, so this line starts in 2023 and the weeks before the archive's daily stretch are
     * a reading apart. 1M reaches back well inside it, so the month is the month.
     */
    it("names the period where the line reaches back past it, years or not", () => {
        const years = [reading("2023-07-15", 100), reading("2025-11-02", 4000), ...daily("2026-08-01", (i) => 7000 + i)];
        hero(years);
        expect(screen.getByText(/in the last 30 days/)).toBeTruthy();
        expect(screen.queryByText(/since the first reading/)).toBeNull();
    });

    /*
     * Bart, 2026-09-22: pikachu holds one card, €281 on the 17th and €280 today, and the chart drew
     * that euro as a fall from the top to the floor, because the line always spans its own lowest
     * reading to its highest. The size of the move is what was missing, not the scale of the chart.
     */
    it("says how big the move is beside it", () => {
        render(
            <ValueHero name="Collection" selected="all" value={280} snapshots={[...daily("2026-09-17", () => 281).slice(0, -1), reading("2026-09-21", 280)]} />,
        );
        // One euro off €281, which is four tenths of a percent: under one percent it keeps a decimal,
        // because "0%" beside an amount that is not nothing leaves two figures arguing.
        expect(screen.getByText("−€1 · 0.4% since the first reading")).toBeTruthy();
    });

    /* Not where the period added cards: a month an import arrived in grew, and a percent over the
       one card it started with would be a true sum and a false sentence. */
    it("leaves the percent out where the period added cards", () => {
        const imported = [
            { ...reading("2026-09-09", 122), cards: 1 },
            { ...reading("2026-09-14", 7761), addedValue: 7700, added: 2260 },
            reading("2026-09-21", 8089),
        ];
        render(<ValueHero name="Collection" selected="all" value={8089} snapshots={imported} />);
        expect(screen.getByText(/\+€7,967 since the first reading/)).toBeTruthy();
        expect(screen.queryByText(/%/)).toBeNull();
    });
});
