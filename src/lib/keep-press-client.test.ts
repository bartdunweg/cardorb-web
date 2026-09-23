import { afterEach, describe, expect, it, vi } from "vitest";
import type { PokemonCard } from "@/lib/api-shapes";
import { keepPress } from "@/lib/keep-press-client";
import { keepPressRequest } from "@/lib/kept-press";

/*
 * The one way a visitor's press is asked to be kept. The route takes a same-origin JSON POST and
 * nothing else, and the page is leaving as it is sent, so the request has to be exactly that and
 * has to be able to outlive the page.
 */

const CARD: PokemonCard = {
    id: "base1-4",
    name: "Charizard",
    set: "Base Set",
    number: "4",
    printedNumber: "4/102",
    rarity: "Holo Rare",
    image: "https://example.com/charizard.png",
    supertype: null,
    subtypes: null,
    hp: "120",
    types: ["Fire"],
    artist: "Mitsuhiro Arita",
    series: "Base",
    releaseDate: null,
    setPrintedTotal: 102,
    flavorText: null,
    nationalPokedexNumbers: [6],
    tcgId: "base1-4",
    language: null,
    holding: null,
    price: 823.98,
};

const sent = () => {
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    return { url, init: init!, body: JSON.parse(String(init!.body)) as unknown };
};

describe("keepPress", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("posts JSON to /api/keep-press with keepalive, so it finishes while the page leaves", () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        keepPress("wishlist", CARD);
        const { url, init } = sent();
        expect(url).toBe("/api/keep-press");
        expect(init.method).toBe("POST");
        expect(init.keepalive).toBe(true);
        expect(init.headers).toEqual({ "content-type": "application/json" });
    });

    it("sends the target and exactly the card fields the route reads, and nothing else", () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        keepPress("collection", CARD);
        const { body } = sent();
        expect(body).toEqual({
            target: "collection",
            card: { name: "Charizard", set: "Base Set", number: "4", rarity: "Holo Rare", types: ["Fire"], tcgId: "base1-4", language: null },
        });
        // What the route will accept, so the shape here and there cannot drift apart unnoticed.
        expect(keepPressRequest.safeParse(body).success).toBe(true);
    });

    it("carries a Japanese card's catalogue id and language, the only way the API finds one", () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        keepPress("wishlist", { ...CARD, tcgId: "SV2a-006", language: "ja", types: null });
        const { body } = sent();
        expect(body).toMatchObject({ card: { tcgId: "SV2a-006", language: "ja", types: null } });
    });

    it("does not throw when the request fails or is refused outright", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
        expect(() => keepPress("wishlist", CARD)).not.toThrow();
        await Promise.resolve();

        vi.stubGlobal(
            "fetch",
            vi.fn(() => {
                throw new TypeError("keepalive body too large");
            }),
        );
        expect(() => keepPress("wishlist", CARD)).not.toThrow();
    });
});
