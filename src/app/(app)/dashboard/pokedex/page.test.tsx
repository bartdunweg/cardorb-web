import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * /dashboard/pokedex is an address that outlived its page: the Pokédex is a binder now. With one
 * it still leads there. Without one it used to redirect to Binders without a word, so somebody who
 * followed an old link landed on a page they did not ask for with nothing said (error-path audit).
 *
 * It is open to somebody with no account too, and for them there is no binder to look for.
 */

const dexBinder = vi.fn<() => Promise<{ id: string; name: string } | null>>();
vi.mock("@/lib/binders", () => ({ getDexBinder: () => dexBinder() }));
const mine = vi.fn<() => Promise<{ userId: string; token: string } | null>>();
vi.mock("@/lib/api", () => ({ session: () => mine() }));
const redirect = vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to), usePathname: () => "/dashboard/pokedex" }));
vi.mock("@/components/app/binder-dialog", () => ({ BinderDialog: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/app/page-header", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));

const PokedexPage = (await import("./page")).default;

describe("the Pokédex address", () => {
    beforeEach(() => {
        mine.mockResolvedValue({ userId: "u1", token: "t" });
    });

    it("leads to the binder that is shown as one", async () => {
        dexBinder.mockResolvedValue({ id: "b1", name: "Pokédex" });
        await expect(PokedexPage()).rejects.toThrow("redirect:/dashboard/collections/b1");
    });

    it("lands with an invitation to make one where there is none, rather than walking off silently", async () => {
        dexBinder.mockResolvedValue(null);
        redirect.mockClear();
        render(await PokedexPage());
        expect(redirect).not.toHaveBeenCalled();
        expect(screen.getByText("No Pokédex yet")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "New binder" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Go to Binders" })).toHaveAttribute("href", "/dashboard/collections");
    });

    it("invites somebody with no account, and asks nothing of theirs", async () => {
        mine.mockResolvedValue(null);
        dexBinder.mockClear();
        redirect.mockClear();
        render(await PokedexPage());
        expect(dexBinder).not.toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
        expect(screen.getByText("The Pokédex comes with an account")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fdashboard%2Fpokedex");
    });
});
