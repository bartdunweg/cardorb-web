import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BindersGrid } from "./binders-grid";

/*
 * A binder's count was printed as the plain number it is, so the Binders page and the sidebar said
 * "1784" while the Pokédex page above them said "1,784 cards" and the Collection said "1,925
 * cards": the same figure written two ways, on screens a tap apart. `formatCount` is the one
 * place that decides how a count is written, and every count goes through it.
 */
describe("what a binder's count looks like", () => {
    const binder = { id: "dex", name: "Pokédex", count: 1784, kind: "manual" as const, rule: null };

    it("groups the thousands, the way every other count on the page is written", () => {
        render(<BindersGrid binders={[binder]} favoritesCount={5} />);
        // The row's own number on a phone, and the "1,784 cards" under the name on a tile: both drawn.
        expect(screen.getAllByText("1,784").length).toBeGreaterThan(0);
        expect(screen.getByText("1,784 cards")).toBeTruthy();
        expect(screen.queryByText("1784")).toBeNull();
        expect(screen.queryByText("1784 cards")).toBeNull();
    });

    it("leaves a count under a thousand as it was", () => {
        render(<BindersGrid binders={[]} favoritesCount={5} />);
        expect(screen.getAllByText("5").length).toBeGreaterThan(0);
        expect(screen.getByText("5 cards")).toBeTruthy();
    });
});

/*
 * The icon is the kit's flat one, a grey disc with no rim or shadow (Bart's call, 2026-09-18): the
 * lifted, rounded-square one read as a button on every row. A disc has no corner to be concentric
 * with the tile's, which is what #726 fixed on the square one. e2e/ui-polish.spec.ts reads it live.
 */
describe("a binder tile's icon", () => {
    it("is the kit's flat disc, with no lifted layer", () => {
        const { container } = render(<BindersGrid binders={[]} favoritesCount={5} />);
        const icon = container.querySelector("[data-featured-icon]")!;
        const classes = icon.className.split(" ");
        expect(classes).toContain("rounded-full");
        expect(classes.some((c) => c.startsWith("before:shadow"))).toBe(false);
    });
});
