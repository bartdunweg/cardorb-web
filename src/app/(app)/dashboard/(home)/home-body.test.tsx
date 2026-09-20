import { beforeEach, describe, expect, it, vi } from "vitest";

// Home's reads, as stand-ins that say when they were asked. The stats are held open by the test, so
// anything asked before they are let go was started without waiting on them.
const { calls, drawn, record, stats, reads } = vi.hoisted(() => {
    const calls: string[] = [];
    /**
     * The props each stubbed child was drawn with. The stubs were `() => null`, so the list Home
     * chose was asserted only where it was read and never where it arrives: handing every child
     * the collection would have left this file green.
     */
    const drawn: Record<string, Record<string, unknown>[]> = {};
    const record =
        (name: string) =>
        (props: Record<string, unknown> = {}) => {
            (drawn[name] ??= []).push(props);
            return null;
        };
    let release: (value: unknown) => void = () => undefined;
    let reject: (error: unknown) => void = () => undefined;
    const stats = {
        hold: () =>
            new Promise((resolve, fail) => {
                release = resolve;
                reject = fail;
            }),
        release: (value: unknown) => release(value),
        fail: (error: unknown) => reject(error),
    };
    const reads = {
        getMyBinders: vi.fn(async () => {
            calls.push("binders");
            return [{ id: "11111111-1111-4111-8111-111111111111", name: "Kanto" }];
        }),
        getValueHistory: vi.fn(async () => {
            calls.push("value history");
            return [];
        }),
        getMyCards: vi.fn(async () => {
            calls.push("list value");
            return { value: 12 };
        }),
        // Each answers with the list it was asked for, so what a child was handed says which list
        // the read behind it was about, not merely that some read happened.
        readTopCards: vi.fn(async (list: string) => {
            calls.push("top cards");
            return [{ list }];
        }),
        readDexCaught: vi.fn(async () => {
            calls.push("dex caught");
            return 151;
        }),
        readListNumbers: vi.fn(async (list: string) => {
            calls.push("list numbers");
            return { sets: 3, caught: 12, list };
        }),
    };
    return { calls, drawn, record, stats, reads };
});

vi.mock("@/lib/cards", () => ({
    getCardStats: vi.fn(() => {
        calls.push("stats");
        return stats.hold();
    }),
    getMyCards: reads.getMyCards,
}));
vi.mock("@/lib/binders", () => ({ getMyBinders: reads.getMyBinders, isPokedexBinder: async () => false }));
vi.mock("@/lib/value-history", () => ({ getValueHistory: reads.getValueHistory }));
vi.mock("@/components/app/top-cards", () => ({ TopCards: record("TopCards"), readTopCards: reads.readTopCards }));
vi.mock("@/components/app/dex-stat", () => ({
    DexStat: record("DexStat"),
    ListNumberStats: record("ListNumberStats"),
    readDexCaught: reads.readDexCaught,
    readListNumbers: reads.readListNumbers,
}));
vi.mock("@/components/app/home-list-choice", () => ({ HomeListChoice: () => null }));
vi.mock("@/components/app/movers", () => ({ Movers: record("Movers") }));
vi.mock("@/components/app/value-hero", () => ({ ValueHero: () => null }));
vi.mock("@/lib/profile", () => ({ getMyProfile: vi.fn() }));
vi.mock("@/components/app/add-card-button", () => ({ AddCardButton: () => null }));

const { HomeBody, welcomeLine } = await import("@/app/(app)/dashboard/(home)/home-body");

/** Lets every read that has been started take its next step. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const isElement = (value: unknown): value is { type: unknown; props: Record<string, unknown> } =>
    typeof value === "object" && value !== null && "type" in value && "props" in value;

/**
 * Walks what HomeBody returned and hands every component it meets its props, so a stub records
 * what it was drawn with. Props are followed as well as children: DexStat travels as CardsStats's
 * `fourth` and the list's counts as ListStats's `later`, neither of them a child.
 *
 * A component that needs a real render (the kit's own) throws and is stepped over: this test reads
 * what our components were handed, not what the browser would draw.
 */
async function draw(node: unknown, depth = 0): Promise<void> {
    if (depth > 12 || node == null || typeof node === "string" || typeof node === "number") return;
    if (Array.isArray(node)) {
        for (const child of node) await draw(child, depth + 1);
        return;
    }
    if (!isElement(node)) return;
    const props = node.props ?? {};
    if (typeof node.type === "function") {
        try {
            await draw(await (node.type as (p: unknown) => unknown)(props), depth + 1);
        } catch {
            // Not ours to render.
        }
    }
    for (const value of Object.values(props)) {
        try {
            await draw(await value, depth + 1);
        } catch {
            // A read that says no is the page's story, not this test's.
        }
    }
}

/** Home drawn for one address, with every child's props in `drawn`. */
async function drawHome(value?: string) {
    for (const key of Object.keys(drawn)) delete drawn[key];
    const body = HomeBody({ searchParams: Promise.resolve(value === undefined ? {} : { value }) });
    await settle();
    stats.release({ owned: 3, value: 40 });
    await draw(await body);
}

/**
 * The props one child was drawn with. A component reached both as an element and inside what its
 * parent returned is recorded twice, with the one props object React would hand it; two different
 * ones would mean Home draws that child twice, which is the thing worth failing on.
 */
const only = (name: string): Record<string, unknown> => {
    const seen = drawn[name] ?? [];
    if (seen.length === 0) throw new Error(`${name} was not drawn`);
    if (seen.some((props) => !Object.is(props, seen[0]))) throw new Error(`${name} was drawn with more than one set of props`);
    return seen[0];
};

describe("HomeBody", () => {
    beforeEach(() => {
        calls.length = 0;
        for (const read of Object.values(reads)) read.mockClear();
    });

    it("starts the value line, the top cards and the Pokémon count before the stats are in", async () => {
        const body = HomeBody({ searchParams: Promise.resolve({}) });
        await settle();
        expect(calls).toContain("stats");
        expect(calls).toEqual(expect.arrayContaining(["binders", "value history", "top cards", "dex caught"]));
        expect(reads.getValueHistory).toHaveBeenCalledWith(undefined);
        stats.release({ owned: 3, value: 40 });
        await body;
    });

    it("reads a binder's value, once the binder is known to still be there, without waiting on the stats", async () => {
        const id = "11111111-1111-4111-8111-111111111111";
        const body = HomeBody({ searchParams: Promise.resolve({ value: id }) });
        await settle();
        expect(reads.getValueHistory).toHaveBeenCalledWith(id);
        expect(reads.getMyCards).toHaveBeenCalledWith({ collectionId: id, limit: 1, facets: false });
        // Its dearest cards, sets and Pokémon are the binder's own, not the collection's Pokédex count.
        expect(reads.readTopCards).toHaveBeenCalledWith(id);
        expect(reads.readListNumbers).toHaveBeenCalledWith(id);
        expect(reads.readDexCaught).not.toHaveBeenCalled();
        stats.release({ owned: 3, value: 40 });
        await body;
    });

    it("reads a binder no longer there as the collection, everywhere at once", async () => {
        const gone = "22222222-2222-4222-8222-222222222222";
        const body = HomeBody({ searchParams: Promise.resolve({ value: gone }) });
        await settle();
        expect(reads.getValueHistory).toHaveBeenCalledWith(undefined);
        expect(reads.readTopCards).toHaveBeenCalledWith("all");
        expect(reads.readListNumbers).not.toHaveBeenCalled();
        stats.release({ owned: 3, value: 40 });
        await body;
    });

    it("still fails the page, for its error screen, when the stats cannot be read", async () => {
        const body = HomeBody({ searchParams: Promise.resolve({}) });
        await settle();
        stats.fail(new Error("stats down"));
        await expect(body).rejects.toThrow("stats down");
    });
});

/*
 * The chosen list has to arrive, not only be read. Every part of Home follows the title's choice,
 * and a child handed the collection while its read was the wishlist's is a page saying two things
 * at once. The stubs above record their props, so this reads what each child was actually given.
 */
describe("the chosen list reaching Home's parts", () => {
    beforeEach(() => {
        calls.length = 0;
        for (const read of Object.values(reads)) read.mockClear();
    });

    it("gives the collection to the movers, the dearest cards and the Pokémon tile", async () => {
        await drawHome();
        expect(only("Movers").list).toBe("all");
        expect(await only("TopCards").top).toEqual([{ list: "all" }]);
        expect(only("TopCards").href).toBe("/dashboard/cards");
        // The collection's fourth tile is the Pokédex's own count; a list has its own numbers instead.
        expect(await only("DexStat").caught).toBe(151);
        expect(drawn.ListNumberStats).toBeUndefined();
    });

    it("gives the wishlist to all three, and none of them the collection", async () => {
        await drawHome("wishlist");
        expect(only("Movers").list).toBe("wishlist");
        expect(await only("TopCards").top).toEqual([{ list: "wishlist" }]);
        expect(only("TopCards").href).toBe("/dashboard/wishlist");
        expect(await only("ListNumberStats").numbers).toMatchObject({ list: "wishlist" });
        expect(only("ListNumberStats").href).toBe("/dashboard/wishlist");
        expect(drawn.DexStat).toBeUndefined();
    });

    it("gives a binder to all three, by its own id", async () => {
        const id = "11111111-1111-4111-8111-111111111111";
        await drawHome(id);
        expect(only("Movers").list).toBe(id);
        expect(await only("TopCards").top).toEqual([{ list: id }]);
        expect(only("TopCards").href).toBe(`/dashboard/collections/${id}`);
        expect(await only("ListNumberStats").numbers).toMatchObject({ list: id });
        expect(drawn.DexStat).toBeUndefined();
    });

    it("gives a binder that is no longer there the collection, everywhere at once", async () => {
        await drawHome("22222222-2222-4222-8222-222222222222");
        expect(only("Movers").list).toBe("all");
        expect(await only("TopCards").top).toEqual([{ list: "all" }]);
        expect(await only("DexStat").caught).toBe(151);
    });
});

/*
 * The first thing a new account reads. It called the username "the address of your public page"
 * while is_public is off until somebody turns it on, so it promised a page that answers to nobody
 * (error-path audit). The promise is only made where the page is really there.
 */
describe("the welcome's sentence", () => {
    it("promises no public page while the profile is private", () => {
        const said = welcomeLine({ username: "ash-4f2b", is_public: false });
        expect(said).not.toMatch(/your public page is at/);
        expect(said).toMatch(/turn on your public page if you want one/);
        expect(said).toMatch(/ash-4f2b/);
    });

    it("gives the address as the username, never as the display name", () => {
        const said = welcomeLine({ display_name: "Bart", username: "ash-4f2b", is_public: true });
        expect(said).toMatch(/signed in as Bart/);
        expect(said).toMatch(/\/user\/ash-4f2b/);
    });

    it("stops asking for a name from somebody who has one", () => {
        expect(welcomeLine({ display_name: "Bart", username: "ash-4f2b", is_public: false })).not.toMatch(/choose a name of your own/);
    });

    it("says the one thing to do when there is no name to say", () => {
        expect(welcomeLine(null)).toBe("Add your first card to start your collection.");
    });
});
