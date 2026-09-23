import { beforeEach, describe, expect, it, vi } from "vitest";

/* A cookie jar that records the order things happen in, so "cleared before the write" can be asserted. */
const events: string[] = [];
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
        delete: (name: string) => {
            events.push(`delete ${name}`);
            jar.delete(name);
        },
        set: (name: string, value: string) => {
            events.push(`set ${name}`);
            jar.set(name, value);
        },
    }),
}));
const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag: (t: string) => updateTag(t) }));
const addCard = vi.fn();
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    addCard: (...a: unknown[]) => {
        events.push("write");
        return addCard(...a);
    },
}));

const { applyKeptPress } = await import("@/lib/kept-press-apply");
const { KEPT_PRESS_COOKIE, KEPT_PRESS_DONE_COOKIE, keptPressValue } = await import("@/lib/kept-press");

const PRESS = {
    target: "wishlist" as const,
    card: { name: "Charizard", set: "Base Set", number: "4", rarity: "Holo Rare", types: ["Fire"], tcgId: "base1-4", language: null },
};
const AS = { token: "fresh-token", userId: "u1", forget: true };

beforeEach(() => {
    events.length = 0;
    jar.clear();
    updateTag.mockReset();
    addCard.mockReset();
    addCard.mockResolvedValue({ ok: true, id: "row-1" });
});

describe("applyKeptPress", () => {
    it("does nothing at all where nothing was kept", async () => {
        expect(await applyKeptPress(AS)).toBeNull();
        expect(addCard).not.toHaveBeenCalled();
    });

    it("adds the card as the person signing in, with the token they were just given", async () => {
        jar.set(KEPT_PRESS_COOKIE, keptPressValue(PRESS));
        const done = await applyKeptPress(AS);
        expect(done).toEqual({ target: "wishlist", name: "Charizard", ok: true });
        const [card, target, binder, options] = addCard.mock.calls[0]!;
        expect(card).toMatchObject({ name: "Charizard", set: "Base Set", number: "4", tcgId: "base1-4" });
        expect(target).toBe("wishlist");
        expect(binder).toBeUndefined();
        expect(options).toMatchObject({ token: "fresh-token", reread: false });
    });

    it("clears the press before it writes, so it can never apply twice", async () => {
        jar.set(KEPT_PRESS_COOKIE, keptPressValue(PRESS));
        await applyKeptPress(AS);
        expect(events.indexOf(`delete ${KEPT_PRESS_COOKIE}`)).toBeLessThan(events.indexOf("write"));
        expect(jar.has(KEPT_PRESS_COOKIE)).toBe(false);
    });

    it("clears it and says so when the write fails, rather than retrying on every page", async () => {
        jar.set(KEPT_PRESS_COOKIE, keptPressValue(PRESS));
        addCard.mockResolvedValue({ ok: false, error: "The API refused." });
        const done = await applyKeptPress(AS);
        expect(done).toEqual({ target: "wishlist", name: "Charizard", ok: false });
        expect(jar.has(KEPT_PRESS_COOKIE)).toBe(false);
        expect(JSON.parse(jar.get(KEPT_PRESS_DONE_COOKIE)!)).toEqual({ target: "wishlist", name: "Charizard", ok: false });
        expect(updateTag).not.toHaveBeenCalled();
    });

    it("drops a stale press unapplied, and silently", async () => {
        jar.set(KEPT_PRESS_COOKIE, keptPressValue(PRESS, Date.now() - 31 * 60 * 1000));
        expect(await applyKeptPress(AS)).toBeNull();
        expect(addCard).not.toHaveBeenCalled();
        expect(jar.has(KEPT_PRESS_COOKIE)).toBe(false);
        expect(jar.has(KEPT_PRESS_DONE_COOKIE)).toBe(false);
    });

    it("forgets the reader's caches only where it may, so the page shows the card", async () => {
        jar.set(KEPT_PRESS_COOKIE, keptPressValue(PRESS));
        await applyKeptPress(AS);
        expect(updateTag).toHaveBeenCalled();
        updateTag.mockReset();
        jar.set(KEPT_PRESS_COOKIE, keptPressValue(PRESS));
        await applyKeptPress({ ...AS, forget: false });
        expect(updateTag).not.toHaveBeenCalled();
    });
});
