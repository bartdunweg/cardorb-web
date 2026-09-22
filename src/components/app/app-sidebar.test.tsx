import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";
import { RoutePendingProvider } from "./route-pending";

/*
 * The frame a visitor sees. Nothing is greyed out and nothing is hidden (Bart, 2026-09-22): every
 * section stays in the navigation and stays pressable, and what an account adds arrives at the
 * press. What the sidebar must not do is pretend to know something about a visitor: a count of a
 * thing nobody was asked about is not 0, and an empty binder list is not "you have no binders".
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/sets" }));
vi.mock("@/components/app/prefetch-routes", () => ({ PrefetchRoutes: () => null }));
vi.mock("@/components/app/command-search", () => ({
    SidebarSearchTrigger: () => <button type="button">Search</button>,
    useCommandSearch: () => ({ open: () => {} }),
}));
/* The dialog reaches for the server action that writes a binder; the sidebar's job here is which
   control is drawn, not what the dialog does once it is open. */
vi.mock("@/components/app/binder-dialog", () => ({ BinderModal: () => null }));
vi.mock("@/components/app/account-menu", () => ({ AccountMenu: ({ account }: { account: { name: string } }) => <div>{account.name}</div> }));

const sidebar = (props: Parameters<typeof AppSidebar>[0]) =>
    render(
        <RoutePendingProvider>
            <AppSidebar {...props} />
        </RoutePendingProvider>,
    );

const visitor = { account: null, binders: null, favoritesCount: null };

describe("the sidebar with nobody signed in", () => {
    beforeEach(() => sidebar(visitor));

    it("offers the way in where the account card stands", () => {
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fsets");
        expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup?next=%2Fsets");
    });

    it("keeps Browse where it was, and pressable", () => {
        expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/sets");
    });

    it("keeps Collection, the wishlist and Favorites in the navigation", () => {
        for (const name of ["Home", "Collection", "Wishlist", "Favorites"]) {
            expect(screen.getByRole("link", { name })).toBeInTheDocument();
        }
    });

    it("says what binders are for rather than listing none", () => {
        expect(screen.getByRole("link", { name: "Sign in to make binders" })).toHaveAttribute("href", "/login?next=%2Fsets");
    });

    it("draws no number beside Favorites, because nobody was asked what they hold", () => {
        expect(screen.getByRole("link", { name: "Favorites" }).textContent).toBe("Favorites");
    });

    it("keeps New binder, as a link to the door rather than the dialog", () => {
        expect(screen.getByRole("link", { name: "New binder" })).toHaveAttribute("href", "/login?next=%2Fsets");
    });
});

describe("the sidebar with somebody signed in", () => {
    it("draws the account, the binders it was handed and the favourites count", async () => {
        // act around the render: the three slots fill in when their promise lands, a frame later.
        await act(async () =>
            sidebar({
                account: Promise.resolve({ name: "Bart", email: "b@example.com", avatarUrl: null }),
                binders: Promise.resolve([{ id: "b1", name: "Shinies", kind: "manual" as const, count: 12 }]),
                favoritesCount: Promise.resolve(4),
            }),
        );
        expect(screen.getByText("Bart")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Shinies/ })).toHaveAttribute("href", "/dashboard/collections/b1");
        // The count rides in the row's own name once it is there: "Favorites 4 cards".
        expect(screen.getByRole("link", { name: /^Favorites/ }).textContent).toMatch(/4/);
        expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    });

    it("keeps New binder as the control that opens the dialog", async () => {
        await act(async () =>
            sidebar({
                account: Promise.resolve({ name: "Bart", email: "b@example.com", avatarUrl: null }),
                binders: Promise.resolve([]),
                favoritesCount: Promise.resolve(null),
            }),
        );
        expect(screen.getByRole("button", { name: "New binder" })).toBeInTheDocument();
    });
});
