import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/base/buttons/button";
import { SheetActionBar } from "./sheet-action-bar";

/*
 * The bar holds whatever the sheet hands it, in order, under their own names; the fade above it
 * is decoration and says nothing. Whether it sticks is a matter for the browser.
 */

describe("SheetActionBar", () => {
    it("renders the buttons it is given, by name, and nothing a reader would hear besides", () => {
        render(
            <SheetActionBar>
                <Button size="md">Add to collection</Button>
                <Button size="md" color="secondary">
                    Add to wishlist
                </Button>
            </SheetActionBar>,
        );
        const buttons = screen.getAllByRole("button");
        expect(buttons.map((b) => b.textContent)).toEqual(["Add to collection", "Add to wishlist"]);
        expect(screen.getByRole("button", { name: "Add to collection" })).toBeEnabled();
        expect(document.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
    });
});
