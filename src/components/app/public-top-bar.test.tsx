import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicTopBar } from "./public-top-bar";

/*
 * The bar carries the two doors, Sign in and Get started, and nothing else (the owner's call,
 * 2026-10-02: Browse the sets left it; the landing page's hero keeps that way in).
 */
describe("the public top bar", () => {
    it("offers both doors, in the order the rest of the app uses", () => {
        render(<PublicTopBar />);
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
        expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup");
    });

    it("gives way to the account menu for somebody who is signed in", () => {
        render(<PublicTopBar menu={<button type="button">Bart</button>} />);
        expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Bart" })).toBeInTheDocument();
    });
});
