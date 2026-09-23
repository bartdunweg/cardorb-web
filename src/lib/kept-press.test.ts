import { describe, expect, it } from "vitest";
import { KEPT_PRESS_MAX_AGE, keepPressRequest, keptPressSentence, keptPressValue, readKeptPress } from "@/lib/kept-press";

/*
 * The cookie comes back from a browser, so these tests are mostly about what is refused. A kept
 * press is applied as the person signing in, so believing the wrong value is a write to a real
 * collection.
 */
const PRESS = {
    target: "wishlist" as const,
    card: { name: "Charizard", set: "Base Set", number: "4", rarity: "Holo Rare", types: ["Fire"], tcgId: "base1-4", language: null },
    from: "/sets/base1",
};
const NOW = 1_800_000_000_000;

describe("readKeptPress", () => {
    it("reads back what the server kept", () => {
        const press = readKeptPress(keptPressValue(PRESS, NOW), NOW + 60_000);
        expect(press?.target).toBe("wishlist");
        expect(press?.card.tcgId).toBe("base1-4");
    });

    it("drops a press past its thirty minutes, unapplied", () => {
        expect(readKeptPress(keptPressValue(PRESS, NOW), NOW + KEPT_PRESS_MAX_AGE * 1000 + 1)).toBeNull();
    });

    it("drops a press dated in the future, which no server wrote", () => {
        expect(readKeptPress(keptPressValue(PRESS, NOW + 60_000), NOW)).toBeNull();
    });

    it("refuses anything but the two things a press can ask for", () => {
        const binder = JSON.stringify({ ...PRESS, target: "binder", at: NOW });
        const remove = JSON.stringify({ ...PRESS, target: "remove", at: NOW });
        expect(readKeptPress(binder, NOW)).toBeNull();
        expect(readKeptPress(remove, NOW)).toBeNull();
    });

    it("carries no field it did not ask for: a row, a binder or another person are dropped", () => {
        const extra = JSON.stringify({ ...PRESS, at: NOW, userId: "someone-else", collectionId: "b1", card: { ...PRESS.card, id: "row-1" } });
        const press = readKeptPress(extra, NOW);
        expect(press).not.toBeNull();
        expect(press).not.toHaveProperty("userId");
        expect(press).not.toHaveProperty("collectionId");
        expect(press?.card).not.toHaveProperty("id");
    });

    it("says nothing about a broken value", () => {
        expect(readKeptPress(undefined, NOW)).toBeNull();
        expect(readKeptPress("not json", NOW)).toBeNull();
        expect(readKeptPress(JSON.stringify({ at: NOW }), NOW)).toBeNull();
        expect(readKeptPress("x".repeat(5000), NOW)).toBeNull();
    });
});

describe("keepPressRequest", () => {
    it("does not let the page choose when the press was made", () => {
        // `at` is the server's to write: a page that sent one would choose its own expiry.
        const parsed = keepPressRequest.parse({ ...PRESS, at: 0 });
        expect(parsed).not.toHaveProperty("at");
    });
});

describe("keptPressSentence", () => {
    it("names the card and where it went", () => {
        expect(keptPressSentence({ target: "wishlist", name: "Charizard", ok: true })).toBe("Charizard is on your wishlist.");
        expect(keptPressSentence({ target: "collection", name: "Charizard", ok: true })).toBe("Charizard is in your collection.");
    });

    it("says so when it did not happen, rather than saying nothing", () => {
        expect(keptPressSentence({ target: "wishlist", name: "Charizard", ok: false })).toBe("Charizard could not be added. Press it again to try.");
    });
});
