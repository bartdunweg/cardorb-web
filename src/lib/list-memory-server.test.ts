import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = { cookie: "", dest: "document" as string | null };
vi.mock("next/headers", () => ({
    cookies: async () => ({ get: (name: string) => (name === "list-memory" && jar.cookie ? { value: jar.cookie } : undefined) }),
    headers: async () => ({ get: (name: string) => (name === "sec-fetch-dest" ? jar.dest : null) }),
}));
const redirect = vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

const { openAsLeft, parseListMemoryCookie } = await import("./list-memory-server");
const { parseListMemory, serializeListMemory } = await import("./list-memory");

describe("openAsLeft", () => {
    beforeEach(() => {
        jar.cookie = serializeListMemory({ "/dashboard/cards": { query: "rarity=Rare" } });
        jar.dest = "document";
        redirect.mockClear();
    });

    it("sends a typed bare address to the list as it was left", async () => {
        await expect(openAsLeft("/dashboard/cards", {})).rejects.toThrow("redirect:/dashboard/cards?rarity=Rare");
    });

    // A cookie written before the term was dropped from the memory still holds one: it is read out
    // here, so a bare address opens on the filters alone and never puts the old term back.
    it("leaves a search term a cookie still holds out of the address", async () => {
        jar.cookie = serializeListMemory({ "/dashboard/cards": { query: "q=pika&rarity=Rare" } });
        await expect(openAsLeft("/dashboard/cards", {})).rejects.toThrow("redirect:/dashboard/cards?rarity=Rare");
    });

    it("does not redirect at all when the term was all the memory held", async () => {
        jar.cookie = serializeListMemory({ "/dashboard/cards": { query: "q=pika" } });
        await openAsLeft("/dashboard/cards", {});
        expect(redirect).not.toHaveBeenCalled();
    });

    it("leaves an address with a query alone", async () => {
        await openAsLeft("/dashboard/cards", { sort: "name" });
        expect(redirect).not.toHaveBeenCalled();
    });

    // The last filter taken off: a `router.replace` of the bare path, fetched by the router
    // (`Sec-Fetch-Dest: empty`) while the cookie still says the old filter. Redirecting put it
    // straight back (a search term, back when the memory still held one, web#656).
    it("never redirects a client navigation, so a cleared filter stays cleared", async () => {
        jar.dest = "empty";
        await openAsLeft("/dashboard/cards", {});
        expect(redirect).not.toHaveBeenCalled();
    });

    it("treats a client that sends no Sec-Fetch-Dest as a document", async () => {
        jar.dest = null;
        await expect(openAsLeft("/dashboard/cards", {})).rejects.toThrow("redirect:/dashboard/cards?rarity=Rare");
    });
});

describe("parseListMemoryCookie", () => {
    // The browser reads the cookie with a guard, to keep zod out of every first load (list-memory.ts).
    // The guard has to answer exactly what the server's schema answers.
    const cases: (string | undefined)[] = [
        undefined,
        "",
        "not json",
        "%7B%22",
        JSON.stringify(["/dashboard/cards"]),
        JSON.stringify(null),
        JSON.stringify("text"),
        JSON.stringify({}),
        JSON.stringify({ "/dashboard/cards": { size: "sm" } }),
        JSON.stringify({ "/dashboard/cards": { view: "huge" } }),
        JSON.stringify({ "/dashboard/cards": { view: "table", other: 1 }, "/b": { group: "none", query: "q=a" } }),
        JSON.stringify({ "/dashboard/cards": { query: "x".repeat(2000) } }),
        JSON.stringify({ "/dashboard/cards": { query: "x".repeat(2001) } }),
        JSON.stringify({ "/dashboard/cards": { query: 5 } }),
        JSON.stringify({ "/dashboard/cards": { size: null } }),
        JSON.stringify({ "": { size: "sm" } }),
        JSON.stringify({ ["/" + "a".repeat(200)]: { size: "sm" } }),
        JSON.stringify({ "/a": [] }),
        JSON.stringify({ "/a": "sm" }),
        serializeListMemory({ "/dashboard/cards": { view: "grid", size: "lg", group: "sets", query: "sort=name" } }),
    ];

    it.each(cases.map((raw) => [raw]))("answers as the browser's guard does for %s", (raw) => {
        expect(parseListMemory(raw)).toEqual(parseListMemoryCookie(raw));
    });
});
