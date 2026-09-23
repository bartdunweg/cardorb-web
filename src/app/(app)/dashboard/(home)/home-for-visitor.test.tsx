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
/* The market's movers: real prices, and nobody's, so they may carry figures where the picture above
   them may not. Null by default, which is the page when the API could not answer. */
const market = vi.hoisted(() => ({ current: null as null | { up: unknown[]; down: unknown[] } }));
vi.mock("@/lib/market-movers", () => ({ getMarketMovers: async () => market.current }));
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

    it("puts them in the document as headings, the way in first, in the order they are on screen", async () => {
        await drawHome();
        const said = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
        expect(said.slice(0, 4)).toEqual(["Home fills up with your own cards", "Total value", "Value over time", "Biggest movers"]);
    });

    /* Revised 2026-09-23: the value and its line are a blurred picture now, at the owner's word.
       What must stay true is that nothing on the page is a number. The picture is a shape, hidden
       from a screen reader, with no text inside it at all: nothing to read, copy or be read aloud. */
    it("draws its picture as a shape with no figure in it, hidden from a screen reader", async () => {
        const { container } = render(await DashboardPage({ searchParams: Promise.resolve({}) }));
        const drawn = [...container.querySelectorAll("svg, canvas, path")];
        expect(drawn.length).toBeGreaterThan(0);
        for (const el of drawn) expect(el.closest("[aria-hidden='true']"), "a drawing outside the hidden decoration").not.toBeNull();
        for (const decoration of container.querySelectorAll("[aria-hidden='true']")) expect(decoration.textContent?.trim()).toBe("");
        // The value and its line say no figure: nothing of a collection nobody has.
        const preview = [...container.querySelectorAll("section, div")].find((el) => el.textContent?.startsWith("Total value"));
        expect(preview?.textContent).not.toMatch(/[€$]|\d/);
    });

    /* The owner's idea: the week's biggest moves across every card, real and nobody's, in the place a
       reader sees their own. The rows are text, since opening one would read the reader's rows. */
    it("shows the market's movers with their real prices, as rows that are not buttons", async () => {
        const move = (name: string, now: number, change: number) => ({
            tcgId: `x-${name}`,
            name,
            number: "4",
            set: "Base Set",
            setAbbr: null,
            printedNumber: "4",
            rarity: null,
            image: null,
            copies: 1,
            was: now - change,
            now,
            change,
            pct: change / (now - change),
            total: change,
            from: "2026-09-16",
            to: "2026-09-23",
        });
        market.current = { up: [move("Charizard", 823.98, 90.51)], down: [move("Blastoise", 200.38, -12)] };
        await drawHome();
        expect(screen.getByRole("heading", { name: "Biggest movers this week" })).toBeInTheDocument();
        expect(screen.getByText("Charizard")).toBeInTheDocument();
        expect(screen.getByText("Blastoise")).toBeInTheDocument();
        expect(screen.getByText(/823\.98/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Charizard/ })).not.toBeInTheDocument();
        market.current = null;
    });

    it("reads nothing of a person's, so nothing is asked of an API that would refuse", async () => {
        await drawHome();
        expect(reads.session).toHaveBeenCalled();
        for (const [name, read] of Object.entries(reads)) {
            if (name === "session") continue;
            expect(read, name).not.toHaveBeenCalled();
        }
    });

    it("offers one way in, at the top, coming back to Home", async () => {
        await drawHome();
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fdashboard");
        expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup?next=%2Fdashboard");
    });

    it("stays out of the index, since an empty Home in a search result is worse than none", () => {
        expect(metadata.robots).toEqual({ index: false });
    });
});
