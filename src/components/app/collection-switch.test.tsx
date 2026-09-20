import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CollectionSwitch } from "./collection-switch";

/*
 * The words, not the movement (the line's slide is e2e/collection-switch.spec.ts).
 *
 * The phone's tab and this tablist both said "My cards" while the sidebar, the page title and the
 * stats said Collection: one thing with two names, which CLAUDE.md forbids. The tab is Collection
 * now, so the list that holds both halves cannot be Collection too; it says which two it holds.
 */
describe("CollectionSwitch words", () => {
    // The kit's tabs measure their line; jsdom has no ResizeObserver to measure with.
    beforeAll(() => {
        class Observer {
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
        }
        vi.stubGlobal("ResizeObserver", Observer);
    });

    it("names the pair, not either half", () => {
        render(<CollectionSwitch current="owned" />);
        expect(screen.getByRole("tablist", { name: "Collection and wishlist" })).toBeInTheDocument();
        expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Collection", "Wishlist"]);
        expect(screen.queryByText("My cards")).not.toBeInTheDocument();
    });
});
