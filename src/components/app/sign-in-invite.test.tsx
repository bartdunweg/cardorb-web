import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { withReturn } from "@/lib/return-to";
import { SignInInvite } from "./sign-in-invite";

/*
 * The closed places say what an account adds there, and the way in carries the page the visitor
 * was on, so signing in puts them back where they were rather than on Home.
 */

let pathname = "/dashboard/collections";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("the invitation behind a closed place", () => {
    it("names what an account adds there", () => {
        pathname = "/dashboard/wishlist";
        render(<SignInInvite place="wishlist" />);
        expect(screen.getByRole("heading", { name: /wishlist/i })).toBeInTheDocument();
        expect(screen.getByText(/cards you are still after/i)).toBeInTheDocument();
    });

    it("offers a way in that comes back to the page you were on", () => {
        pathname = "/dashboard/collections";
        render(<SignInInvite place="binders" />);
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fdashboard%2Fcollections");
        expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup?next=%2Fdashboard%2Fcollections");
    });

    it("says something of its own for every closed place", () => {
        pathname = "/dashboard";
        for (const place of ["binders", "collection", "wishlist", "pokedex"] as const) {
            const { unmount } = render(<SignInInvite place={place} />);
            expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
            unmount();
        }
    });
});

describe("the address that comes back", () => {
    it("carries a path of this app", () => {
        expect(withReturn("/login", "/sets/base1")).toBe("/login?next=%2Fsets%2Fbase1");
    });

    it("carries nothing else, so the door cannot be pointed at another site", () => {
        expect(withReturn("/login", "https://example.com")).toBe("/login");
        expect(withReturn("/login", "//example.com")).toBe("/login");
    });

    it("never comes back to the door itself", () => {
        expect(withReturn("/login", "/login")).toBe("/login");
        expect(withReturn("/signup", "/signup")).toBe("/signup");
    });
});
