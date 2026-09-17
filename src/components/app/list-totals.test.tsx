import { memo } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListTotalsProvider, LiveDatapoints, useListTotals } from "./list-totals";

/*
 * Every tile on a list reads where its presses are counted, and the line under the title reads the
 * tally. The two were one context value, new on each press, so a press on one tile drew every tile
 * on the list again. A tile now reads a function that keeps its identity; only the line moves.
 */
describe("the tally a list's presses move", () => {
    it("moves the line under the title without drawing the tiles again", () => {
        const seen: unknown[] = [];
        let press: ReturnType<typeof useListTotals> = null;
        const Tile = memo(function Tile() {
            const change = useListTotals();
            seen.push(change);
            press = change;
            return null;
        });
        render(
            <ListTotalsProvider>
                <LiveDatapoints datapoints={{ total: 3, copies: 3, narrowed: false }} />
                <Tile />
            </ListTotalsProvider>,
        );
        expect(screen.getByText("3 cards")).toBeInTheDocument();

        act(() => press?.({ copies: 2, rows: 1 }));
        expect(screen.getByText("5 cards")).toBeInTheDocument();
        act(() => press?.({ copies: -1 }));
        expect(screen.getByText("4 cards")).toBeInTheDocument();

        // One render of the tile, and the same function in it throughout.
        expect(seen).toHaveLength(1);
        expect(typeof seen[0]).toBe("function");
    });

    it("is nothing outside a list page", () => {
        let change: ReturnType<typeof useListTotals> | undefined;
        function Tile() {
            change = useListTotals();
            return null;
        }
        render(<Tile />);
        expect(change).toBeNull();
    });
});
