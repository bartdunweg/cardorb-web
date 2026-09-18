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
 * The tile is 12 px round with 16 px of padding and its icon was 12 px round too: two corners side
 * by side that did not share a centre. Concentric is 12 less 16, nothing, so the icon takes lg
 * (8 px) and its inner layer, inset 4 px, sm (4 px). e2e/ui-polish.spec.ts reads the computed radii.
 */
describe("a binder tile's icon", () => {
    it("takes a corner concentric with the tile's rather than the kit's 12 px", () => {
        const { container } = render(<BindersGrid binders={[]} favoritesCount={5} />);
        const icon = container.querySelector("[data-featured-icon]")!;
        const classes = icon.className.split(" ");
        expect(classes).toContain("rounded-lg");
        expect(classes).toContain("before:rounded-sm");
        expect(classes).not.toContain("rounded-[12px]");
        expect(classes).not.toContain("before:rounded-[8px]");
    });
});
