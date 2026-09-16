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

const { openAsLeft } = await import("./list-memory-server");
const { serializeListMemory } = await import("./list-memory");

describe("openAsLeft", () => {
    beforeEach(() => {
        jar.cookie = serializeListMemory({ "/dashboard/cards": { query: "q=pika" } });
        jar.dest = "document";
        redirect.mockClear();
    });

    it("sends a typed bare address to the list as it was left", async () => {
        await expect(openAsLeft("/dashboard/cards", {})).rejects.toThrow("redirect:/dashboard/cards?q=pika");
    });

    it("leaves an address with a query alone", async () => {
        await openAsLeft("/dashboard/cards", { sort: "name" });
        expect(redirect).not.toHaveBeenCalled();
    });

    // The search field emptied, the last filter taken off: a `router.replace` of the bare path,
    // fetched by the router (`Sec-Fetch-Dest: empty`) while the cookie still says the old term.
    // Redirecting put the term straight back.
    it("never redirects a client navigation, so a cleared search stays cleared", async () => {
        jar.dest = "empty";
        await openAsLeft("/dashboard/cards", {});
        expect(redirect).not.toHaveBeenCalled();
    });

    it("treats a client that sends no Sec-Fetch-Dest as a document", async () => {
        jar.dest = null;
        await expect(openAsLeft("/dashboard/cards", {})).rejects.toThrow("redirect:/dashboard/cards?q=pika");
    });
});
