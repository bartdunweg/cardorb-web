import { z } from "zod";
import { moversFor } from "@/app/(app)/dashboard/(home)/actions";
import {
    cardFacts,
    cardFactsMany,
    cardPriceHistory,
    collectionIndex,
    listRows,
    listSetRows,
    searchMyCards,
    searchPokemon,
    seriesLogo,
    suggestCardTitles,
} from "@/app/(app)/dashboard/cards/actions";
import { loadFacets } from "@/app/(app)/dashboard/collections/actions";
import { countCards, loadMoreCards, warmList } from "@/app/(app)/dashboard/list-actions";
import { countShelf, listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import { session } from "@/lib/api";
import { CARD_FACTS_BATCH } from "@/lib/api-shapes";
import { getBinderChoices } from "@/lib/binders";
import { PERIODS } from "@/lib/chart-periods";
import { type BrowseLanguage, isBrowseLanguage } from "@/lib/languages";
import { loadMoreInput, titleScope } from "@/lib/list-filter";

/**
 * The reads a screen makes after it is drawn: a card sheet's facts, price line, copies, binders and
 * facets, a set page's rows, the lists warmed for the next tab, Home's movers, a list's next batch
 * and its Filters count, the search boxes and their shelf of sets. Each answers exactly
 * what the server action of the same name answers, and the client asks them through `@/lib/reads`.
 *
 * Routes and not server actions, for the reason /api/sidebar-counts is one. Next runs a page's
 * actions one at a time, so a sheet's four to six reads ran in a row (POSTs at +0, +694, +417 and
 * +293 ms in production, 2026-09-16), the sheet took 1.4 s to fill, and a star pressed meanwhile
 * waited behind all of them. Fetches run side by side and hold back no write.
 *
 * Every answer is the caller's own, found from their session; nobody else's id or token is taken
 * from the address. No session is a 401, which the client reads as the same failure the action
 * gave a signed-out visitor: soft for a public profile's sheet, thrown for a search. Nothing here
 * writes, so a GET another site makes a browser send can learn nothing it can read back and change
 * nothing.
 */

/** The single values of an address's query, for a schema to read. */
const params = (q: URLSearchParams) => Object.fromEntries(q.entries());

const text = z.string().min(1).max(200);
const language = z.enum(["en", "ja"]).optional();

/**
 * A structured input, sent as one JSON value in `input` (a list's filter with its arrays and
 * flags, a search's chips), checked against `schema`. The length is bounded before anything is
 * parsed: the largest honest filter (fifty sets of a hundred characters) is well under it.
 */
const INPUT_CHARS = 8000;
function json<S extends z.ZodType>(q: URLSearchParams, schema: S): z.infer<S> | undefined {
    const raw = q.get("input");
    if (!raw || raw.length > INPUT_CHARS) return undefined;
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return undefined;
    }
    const p = schema.safeParse(value);
    return p.success ? p.data : undefined;
}

const searchTerm = z.string().trim().max(100);
const chip = z.string().trim().min(1).max(100).optional();
const browseLanguage = z.custom<BrowseLanguage>(isBrowseLanguage);

const READS: Record<string, (q: URLSearchParams) => Promise<unknown> | null> = {
    facts: (q) => {
        const p = z.object({ id: z.string().min(1).max(64), language }).safeParse(params(q));
        return p.success ? cardFacts(p.data.id, p.data.language) : null;
    },
    "facts-many": (q) => {
        const p = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(CARD_FACTS_BATCH), language }).safeParse({ ...params(q), ids: q.getAll("id") });
        return p.success ? cardFactsMany(p.data.ids, p.data.language) : null;
    },
    prices: (q) => {
        const p = z.object({ id: z.string().min(1).max(64) }).safeParse(params(q));
        return p.success ? cardPriceHistory(p.data.id) : null;
    },
    "series-logo": (q) => {
        const p = z.object({ series: text }).safeParse(params(q));
        return p.success ? seriesLogo(p.data.series) : null;
    },
    rows: (q) => {
        const p = z
            .object({
                set: text.optional(),
                number: z.string().max(32).optional(),
                name: text,
                set_name: text.optional(),
                tcg_id: z.string().max(64).optional(),
            })
            .safeParse(params(q));
        return p.success ? listRows({ ...p.data, set: p.data.set ?? "", number: p.data.number ?? "" }) : null;
    },
    "set-rows": (q) => {
        const p = z.object({ set: text }).safeParse(params(q));
        return p.success ? listSetRows(p.data.set) : null;
    },
    folders: () => getBinderChoices(),
    facets: () => loadFacets(),
    "warm-list": (q) => warmList(params(q)).then(() => null),
    movers: (q) => {
        const p = z.object({ period: z.enum(PERIODS.map((x) => x.key) as [string, ...string[]]) }).safeParse(params(q));
        return p.success ? moversFor(p.data.period as (typeof PERIODS)[number]["key"]) : null;
    },
    /* The reads a list and the search boxes make while you use them: a batch on scroll, the Filters
       sheet's count, the three searches and the shelf beside them. No schema is stricter than the
       action's own, so an input the action would have answered with an empty list is a 400 the
       client reads as that same list. */
    more: (q) => {
        const filter = json(q, loadMoreInput);
        return filter ? loadMoreCards(filter) : null;
    },
    count: (q) => {
        const filter = json(q, loadMoreInput.omit({ offset: true }));
        return filter ? countCards(filter) : null;
    },
    "my-cards": (q) => {
        const p = json(q, z.object({ q: searchTerm, set: chip, rarity: chip }));
        return p ? searchMyCards(p.q, { set: p.set, rarity: p.rarity }) : null;
    },
    "title-index": (q) => {
        const scope = json(q, titleScope);
        return scope ? collectionIndex(scope) : null;
    },
    titles: (q) => {
        const p = json(q, titleScope.extend({ q: z.string().trim().min(2).max(100) }));
        if (!p) return null;
        const { q: term, ...scope } = p;
        return suggestCardTitles(term, scope);
    },
    catalogue: (q) => {
        const p = json(
            q,
            z.object({
                q: searchTerm,
                set: chip,
                type: chip,
                language: browseLanguage.optional(),
                fullArt: z.boolean().optional(),
                page: z.number().int().min(1).max(50),
            }),
        );
        if (!p) return null;
        const { q: term, page, ...filters } = p;
        return searchPokemon(term, filters, page);
    },
    "sets-shelf": (q) => {
        // Any other language is English, as the action takes it; only the length is this route's to bound.
        const p = z.object({ language: z.string().max(8).optional() }).safeParse(params(q));
        return p.success ? listSetsShelf(isBrowseLanguage(p.data.language) ? p.data.language : "en") : null;
    },
    // Browse's Filters counts. The action reads an unknown language or progress as the default and cuts the term to 100.
    "shelf-count": (q) => {
        const p = z
            .object({ language: z.string().max(8).default("en"), progress: z.string().max(16).default("all"), q: z.string().max(200).optional() })
            .safeParse(params(q));
        return p.success ? countShelf(p.data) : null;
    },
};

export async function GET(request: Request, { params: route }: { params: Promise<{ what: string }> }) {
    const { what } = await route;
    const read = Object.hasOwn(READS, what) ? READS[what] : undefined;
    if (!read) return new Response(null, { status: 404 });
    if (!(await session())) return new Response(null, { status: 401 });
    const answer = read(new URL(request.url).searchParams);
    if (!answer) return new Response(null, { status: 400 });
    return Response.json((await answer) ?? null, { headers: { "Cache-Control": "no-store" } });
}
