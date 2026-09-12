import { describe, expect, it, vi } from "vitest";

// Only the wiring is under test: the API is a stand-in, and perUser hands its work a token and
// runs it, which is what it does on a cache miss anyway.
const { api } = vi.hoisted(() => ({ api: vi.fn(async () => ({ folders: [] as unknown[] })) }));
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api }));
vi.mock("@/lib/user-cache", () => ({ perUser: (_key: string, run: (token?: string) => unknown) => run("t.o.k.e.n") }));

const { getDexBinder } = await import("@/lib/collections");

const folder = (id: string, name: string, pokedex: unknown = null) => ({
    id,
    name,
    count: 0,
    kind: "manual",
    rule: null,
    pokedex,
    isPublic: false,
});

describe("getDexBinder", () => {
    it("finds the binder shown as a Pokédex", async () => {
        api.mockResolvedValue({ folders: [folder("a", "Kanto"), folder("b", "Pokédex", { missing: true })] });
        expect(await getDexBinder()).toMatchObject({ id: "b", name: "Pokédex", pokedex: { missing: true } });
    });

    it("says none where no binder is shown as one", async () => {
        api.mockResolvedValue({ folders: [folder("a", "Kanto")] });
        expect(await getDexBinder()).toBeNull();
    });

    it("takes the first, where somebody keeps two", async () => {
        api.mockResolvedValue({
            folders: [folder("a", "Gen 1", { missing: false }), folder("b", "Everything", { missing: true })],
        });
        expect(await getDexBinder()).toMatchObject({ id: "a" });
    });
});
