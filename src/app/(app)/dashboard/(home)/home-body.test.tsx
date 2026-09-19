import { beforeEach, describe, expect, it, vi } from "vitest";

// Home's reads, as stand-ins that say when they were asked. The stats are held open by the test, so
// anything asked before they are let go was started without waiting on them.
const { calls, stats, reads } = vi.hoisted(() => {
    const calls: string[] = [];
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
        readTopCards: vi.fn(async () => {
            calls.push("top cards");
            return [];
        }),
        readDexCaught: vi.fn(async () => {
            calls.push("dex caught");
            return 151;
        }),
        readListNumbers: vi.fn(async () => {
            calls.push("list numbers");
            return { sets: 3, caught: 12 };
        }),
    };
    return { calls, stats, reads };
});

vi.mock("@/lib/cards", () => ({
    getCardStats: vi.fn(() => {
        calls.push("stats");
        return stats.hold();
    }),
    getMyCards: reads.getMyCards,
}));
vi.mock("@/lib/binders", () => ({ getMyBinders: reads.getMyBinders, getDexBinder: async () => null }));
vi.mock("@/lib/value-history", () => ({ getValueHistory: reads.getValueHistory }));
vi.mock("@/components/app/top-cards", () => ({ TopCards: () => null, readTopCards: reads.readTopCards }));
vi.mock("@/components/app/dex-stat", () => ({
    DexStat: () => null,
    ListNumberStats: () => null,
    readDexCaught: reads.readDexCaught,
    readListNumbers: reads.readListNumbers,
}));
vi.mock("@/components/app/home-list-choice", () => ({ HomeListChoice: () => null }));
vi.mock("@/components/app/movers", () => ({ Movers: () => null }));
vi.mock("@/components/app/value-hero", () => ({ ValueHero: () => null }));
vi.mock("@/lib/profile", () => ({ getMyProfile: vi.fn() }));
vi.mock("@/components/app/add-card-button", () => ({ AddCardButton: () => null }));

const { HomeBody } = await import("@/app/(app)/dashboard/(home)/home-body");

/** Lets every read that has been started take its next step. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

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
