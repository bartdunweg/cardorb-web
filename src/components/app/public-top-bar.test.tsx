import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicTopBar } from "./public-top-bar";

/*
 * The landing page's only way forward used to be making an account, which is the one thing
 * somebody who has never heard of Cardorb is least willing to do first. The door has to stand on
 * every page a stranger can arrive on, not only on the landing.
 */
describe("the public top bar", () => {
    it("offers the way into the app", () => {
        render(<PublicTopBar />);
        expect(screen.getByRole("link", { name: /browse the sets/i })).toHaveAttribute("href", "/sets");
    });

    it("still offers both doors, in the order the rest of the app uses", () => {
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
