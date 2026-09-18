import { type APIRequestContext, expect, test } from "@playwright/test";

/**
 * The catalogue search, with every outside host blocked.
 *
 * The crawl of 2026-09-17 found the palette answering "The card service didn't answer." to every
 * term in this stack, and the API's log said why: "TCGdex card search failed after 3 attempts".
 * The copy was in the same database the whole time, with every card of the fixture in it; the API
 * asked whether there was a copy by counting catalogue_sync, which this stack seeds no row of, so
 * it took a full catalogue for an empty one and went outside. The e2e job blocks api.tcgdex.net,
 * so outside was nowhere.
 *
 * These go through GET /api/read/catalogue, the same read the palette and the add-card dialog
 * make (`searchPokemon`), rather than through the palette itself: the palette answers an English
 * term out of the catalogue document it holds in the browser and would never reach the API at
 * all, which is exactly how this stayed hidden until a document failed to load.
 */
const search = async (request: APIRequestContext, input: Record<string, unknown>) => {
    const res = await request.get(`/api/read/catalogue?input=${encodeURIComponent(JSON.stringify({ page: 1, ...input }))}`);
    expect(res.ok(), `search ${JSON.stringify(input)} answered ${res.status()}`).toBe(true);
    return (await res.json()) as { items: { id: string; name: string }[]; total?: number };
};

test("a term is answered out of the copy, with no catalogue reachable", async ({ request }) => {
    const { items } = await search(request, { q: "tarountula" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((c) => c.name)).toContain("Tarountula");
});

test("what the name starts with comes first, then what holds it further in", async ({ request }) => {
    const { items } = await search(request, { q: "tarountula" });
    const names = items.map((c) => c.name);
    // Three Tarountula and one Dark Tarountula in the fixture: every plain one before the dark.
    expect(names.filter((n) => n === "Tarountula")).toHaveLength(3);
    expect(names.indexOf("Dark Tarountula")).toBe(3);
});

test("a diacritic in the name is not something anyone has to type", async ({ request }) => {
    const { items } = await search(request, { q: "poke ball" });
    expect(items.map((c) => c.name)).toContain("Poké Ball");
    // And typed as the card prints it, which is what worked before this.
    const written = await search(request, { q: "poké ball" });
    expect(written.items.map((c) => c.name)).toContain("Poké Ball");
});

test("a hyphen reads as a space, and a space as a hyphen", async ({ request }) => {
    for (const q of ["ho oh", "ho-oh"]) {
        const { items } = await search(request, { q });
        expect(
            items.map((c) => c.name),
            `"${q}"`,
        ).toContain("Ho-Oh ex");
    }
});

test("a set's id names the set, and the word beside it still names the card", async ({ request }) => {
    const { items } = await search(request, { q: "sv01 pineco" });
    expect(items.map((c) => c.name)).toContain("Pineco");
    const alone = await search(request, { q: "sv01" });
    expect(alone.items.length).toBeGreaterThan(0);
});

/* The set's printed code as well (cardorb-api #560): beside another word it narrows to the set,
   on its own it is the set. The fixture is one set, Scarlet & Violet, whose code is SVI. */
test("a set's printed code names the set, beside a number or a name and on its own", async ({ request }) => {
    const numbered = await search(request, { q: "svi 001" });
    expect(numbered.items.map((c) => c.id)).toEqual(["sv01-001"]);
    const named = await search(request, { q: "SVI pineco" });
    expect(named.items.map((c) => c.name)).toEqual(["Pineco"]);
    const alone = await search(request, { q: "svi" });
    expect(alone.items.length).toBeGreaterThan(0);
    expect(alone.items.every((c) => c.id.startsWith("sv01-"))).toBe(true);
});

test("the count is of the whole search, not of the page shown", async ({ request }) => {
    const { items, total } = await search(request, { q: "tarountula" });
    expect(total).toBe(items.length);
});
