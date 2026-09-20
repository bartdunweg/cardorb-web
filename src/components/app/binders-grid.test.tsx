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

/*
 * A new account: the only binder is Favorites with nothing in it. The page said "Favorites" and
 * "0", and on a phone the empty state was hidden outright, so the whole page was a tile and a zero
 * (error-path audit). The zero goes, and the invitation is there at every width.
 */
describe("a new account's Binders page", () => {
    it("says nothing where there is nothing to count", () => {
        const { container } = render(<BindersGrid binders={[]} favoritesCount={0} />);
        expect(container.textContent).not.toMatch(/\b0\b/);
        expect(container.textContent).not.toMatch(/0 cards/);
        expect(container.textContent).toMatch(/Favorites/);
    });

    it("invites a first binder on a phone as well as on a desktop", () => {
        const { container, getAllByRole } = render(<BindersGrid binders={[]} favoritesCount={0} />);
        expect(container.textContent).toMatch(/No binders yet/);
        // Two invitations, one per width, and neither of them hidden from a screen reader.
        expect(getAllByRole("button", { name: "New binder" }).length).toBe(2);
        expect(container.querySelector(".hidden.lg\\:contents")).not.toBeNull();
        expect(container.querySelector(".lg\\:hidden")).not.toBeNull();
    });

    it("leaves a binder that holds cards with its count", () => {
        const { container } = render(<BindersGrid binders={[{ id: "b1", name: "Shinies", count: 3, kind: "manual", rule: null }]} favoritesCount={2} />);
        expect(container.textContent).toMatch(/3 cards/);
        expect(container.textContent).toMatch(/2 cards/);
    });
});
