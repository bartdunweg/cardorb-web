import { describe, expect, it, vi } from "vitest";
import { type ScopeRef, forgetTags, readTags } from "@/lib/cache-scopes";

/*
 * Only the filing is under test: which scope, which piece of it and which key a set page's answer
 * is kept under, and whether a write that names the set reaches that piece.
 *
 * This is the gap #763 fell through. `getSet` keys the page on the id the address asked for, while
 * the API answers the canonical set: an old or differently cased address was filed under one id and
 * forgotten under another, so a press dropped nothing and the page kept its marks for five minutes.
 */
const { api, filed } = vi.hoisted(() => ({
    api: vi.fn(),
    filed: [] as { ref: ScopeRef; key: string }[],
}));
/* Signed in, because these tests are about the per-person cache key. The road for a reader with
   no session is a different one and has its own tests. */
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api, session: async () => ({ userId: "u1", token: "t.o.k.e.n" }) }));
vi.mock("@/lib/user-cache", () => ({
    perUser: (ref: ScopeRef, key: string, run: (token: string) => unknown) => {
        filed.push({ ref, key });
        return run("t.o.k.e.n");
    },
}));

const { getSet } = await import("@/lib/sets");

/** The API's answer, which carries the canonical id whatever address it was asked under. */
const answer = (canonical: string) => ({
    set: {
        id: canonical,
        name: "Scarlet & Violet",
        localName: null,
        series: "Scarlet & Violet",
        releaseDate: "2023/03/31",
        logo: null,
        total: 258,
        abbreviation: "SVI",
    },
    cards: [],
    totalCount: 258,
    ownedCount: 3,
    hasMore: false,
});

const lastRead = () => {
    const read = filed.at(-1);
    if (!read) throw new Error("getSet filed nothing");
    return read;
};

describe("getSet's cache key", () => {
    it("keeps each set's page in its own piece of the setPages scope", async () => {
        api.mockResolvedValue(answer("sv01"));
        await getSet("sv01");
        expect(lastRead().ref).toEqual({ scope: "setPages", part: "sv01" });
        expect(lastRead().key).toContain(":sv01");

        api.mockResolvedValue(answer("base1"));
        await getSet("base1");
        expect(lastRead().ref).toEqual({ scope: "setPages", part: "base1" });
    });

    it("files the page under the id it was read with, not the one the API answers with", async () => {
        api.mockResolvedValue(answer("sv01"));
        // A differently cased address, and an old catalogue's id: the API resolves both to `sv01`.
        await getSet("SV01");
        expect(lastRead().ref).toEqual({ scope: "setPages", part: "SV01" });

        await getSet("swsh12pt5gg");
        expect(lastRead().ref).toEqual({ scope: "setPages", part: "swsh12pt5gg" });
    });

    it("names the language and the price day in the key, so two shelves and two days are two entries", async () => {
        api.mockResolvedValue(answer("sv01"));
        await getSet("sv01", "en");
        const english = lastRead().key;
        await getSet("sv01", "ja");
        expect(lastRead().key).not.toBe(english);
        expect(lastRead().key).toContain("ja");
        // Seven days back, the window the page's price change covers, as the API writes a date.
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
        expect(english).toBe(`set:v2:en:${weekAgo}:sv01`);
    });
});

describe("a card write that names the set", () => {
    it("forgets exactly the entry the page was read under", async () => {
        api.mockResolvedValue(answer("sv01"));
        await getSet("SV01");
        const held = readTags("u1", lastRead().ref);

        // The set page hands its tiles the address's own id, and the tile's write names that one.
        expect(forgetTags("u1", "cards", "SV01").some((tag) => held.includes(tag))).toBe(true);
        // The canonical id, which is what a write from the API names: the tags meet, folded (api#579).
        expect(forgetTags("u1", "cards", "sv01").some((tag) => held.includes(tag))).toBe(true);
        // Another set's press leaves this page standing, which is what keeping them apart is for.
        expect(forgetTags("u1", "cards", "base1").some((tag) => held.includes(tag))).toBe(false);
        // A write that cannot name a set drops every set page, this one among them.
        expect(forgetTags("u1", "cards").some((tag) => held.includes(tag))).toBe(true);
    });
});
