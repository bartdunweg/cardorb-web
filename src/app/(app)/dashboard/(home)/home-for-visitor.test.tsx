import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Home for somebody with no account. Two things are worth failing on, and they are the two a future
 * edit breaks: that the page says what each of its three places is for, and that it asks the API for
 * nothing on the way. A read started for a visitor is an error page where an invitation belonged.
 */

const reads = vi.hoisted(() => ({
    session: vi.fn(async (): Promise<{ userId: string; token: string } | null> => null),
    getCardStats: vi.fn(),
    getMyCards: vi.fn(),
    getMyBinders: vi.fn(),
    getMyProfile: vi.fn(),
    getValueHistory: vi.fn(),
    readTopCards: vi.fn(),
    readDexCaught: vi.fn(),
    readListNumbers: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/lib/api", () => ({ session: reads.session }));
vi.mock("@/lib/cards", () => ({ getCardStats: reads.getCardStats, getMyCards: reads.getMyCards }));
vi.mock("@/lib/binders", () => ({ getMyBinders: reads.getMyBinders, isPokedexBinder: vi.fn() }));
vi.mock("@/lib/profile", () => ({ getMyProfile: reads.getMyProfile, accountFrom: vi.fn() }));
vi.mock("@/lib/value-history", () => ({ getValueHistory: reads.getValueHistory }));
vi.mock("@/components/app/top-cards", () => ({ TopCards: () => null, readTopCards: reads.readTopCards }));
vi.mock("@/components/app/dex-stat", () => ({
    DexStat: () => null,
    ListNumberStats: () => null,
    readDexCaught: reads.readDexCaught,
    readListNumbers: reads.readListNumbers,
}));
// The bar measures the scroll and the title's position, neither of which this test is about.
vi.mock("@/components/app/page-header", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));

const { default: DashboardPage, metadata } = await import("@/app/(app)/dashboard/(home)/page");

/** Home drawn for a visitor, as a Server Component returns it. */
async function drawHome() {
    render(await DashboardPage({ searchParams: Promise.resolve({}) }));
}

describe("Home, for somebody with no account", () => {
    beforeEach(() => {
        for (const read of Object.values(reads)) read.mockClear();
        reads.session.mockResolvedValue(null);
    });

    it("keeps its three places, each saying what would be there", async () => {
        await drawHome();
        expect(screen.getByRole("heading", { name: "Total value" })).toBeInTheDocument();
        expect(screen.getByText("What your collection is worth, updated every day")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Value over time" })).toBeInTheDocument();
        expect(screen.getByText("See how your collection moved this week, and over the last year")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Biggest movers" })).toBeInTheDocument();
        expect(screen.getByText("The cards that rose and fell most, so you know what moved without checking each one")).toBeInTheDocument();
    });

    it("puts them in the document as headings, in the order they are on screen", async () => {
        await drawHome();
        const said = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
        expect(said.slice(0, 3)).toEqual(["Total value", "Value over time", "Biggest movers"]);
    });

    it("draws no chart and no number, because there is no collection to draw one of", async () => {
        const { container } = render(await DashboardPage({ searchParams: Promise.resolve({}) }));
        expect(container.querySelectorAll("svg, canvas, path")).toHaveLength(0);
        expect(container.textContent).not.toMatch(/[€$]|\d/);
    });

    it("reads nothing of a person's, so nothing is asked of an API that would refuse", async () => {
        await drawHome();
        expect(reads.session).toHaveBeenCalled();
        for (const [name, read] of Object.entries(reads)) {
            if (name === "session") continue;
            expect(read, name).not.toHaveBeenCalled();
        }
    });

    it("offers one way in, at the end, coming back to Home", async () => {
        await drawHome();
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fdashboard");
        expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup?next=%2Fdashboard");
    });

    it("stays out of the index, since an empty Home in a search result is worse than none", () => {
        expect(metadata.robots).toEqual({ index: false });
    });
});
