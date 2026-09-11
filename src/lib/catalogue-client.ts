"use client";

import { z } from "zod";
import { type PokemonCard, browseCardSchema, pokemonCardFromBrowse } from "@/lib/api-shapes";
import { type CatalogueIndex, catalogueIndexSchema } from "@/lib/catalogue-index";

/**
 * The two reads a search in the browser makes of the Card Orb API, from the browser.
 *
 * Every other read of the API goes through `src/lib/api.ts` on the server (R-DATA-003), and
 * these two are the same road by another lane: `/api/v1/*` on this origin is the API itself
 * (vercel.json, and next.config.mjs in development), and the session cookie rides along. They
 * live here because the thing that makes a search fast is that the document is in the browser
 * and stays there: a day in the HTTP cache under the API's ETag, which a server action could
 * not give it.
 */

let index: Promise<CatalogueIndex | null> | null = null;

/**
 * The catalogue, once per page load: the browser's cache answers the next day's opens without
 * a byte. Null where the API has none yet (404, before the first nightly copy) or would not
 * answer, and the search asks the server as it did; a failure is not kept, so the next open
 * asks again.
 */
export function loadCatalogueIndex(): Promise<CatalogueIndex | null> {
    if (index) return index;
    index = (async () => {
        try {
            const res = await fetch("/api/v1/catalog/index", { credentials: "include" });
            if (!res.ok) return null;
            const parsed = catalogueIndexSchema.safeParse(await res.json());
            if (!parsed.success) {
                console.error("The catalogue index answered something unexpected:", parsed.error.issues[0]);
                return null;
            }
            return parsed.data;
        } catch (err) {
            console.error("The catalogue index could not be read:", err instanceof Error ? err.message : err);
            return null;
        }
    })().then((found) => {
        if (!found) index = null;
        return found;
    });
    return index;
}

const lookupAnswer = z.object({ cards: z.array(browseCardSchema) });

/**
 * What the API knows about these hits that the document does not: owned, wishlist, how many,
 * and the day's price. Fifty at most per call, the route's limit; asked for the hits on screen.
 * Throws where the API would not answer: the hits are already shown, and the caller decides
 * what to do without the marks.
 */
export async function lookupCards(ids: string[]): Promise<PokemonCard[]> {
    if (!ids.length) return [];
    const res = await fetch(`/api/v1/catalog/cards?ids=${encodeURIComponent(ids.slice(0, 50).join(","))}`, { credentials: "include" });
    if (!res.ok) throw new Error(`The API answered ${res.status}.`);
    return lookupAnswer.parse(await res.json()).cards.map((c) => pokemonCardFromBrowse(c));
}
