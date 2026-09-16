import { z } from "zod";
import { moversFor } from "@/app/(app)/dashboard/(home)/actions";
import { cardFacts, cardFactsMany, cardPriceHistory, listRows, listSetRows, seriesLogo } from "@/app/(app)/dashboard/cards/actions";
import { loadFacets } from "@/app/(app)/dashboard/collections/actions";
import { warmList } from "@/app/(app)/dashboard/list-actions";
import { session } from "@/lib/api";
import { CARD_FACTS_BATCH } from "@/lib/api-shapes";
import { PERIODS } from "@/lib/chart-periods";
import { getFolderChoices } from "@/lib/collections";

/**
 * The reads a screen makes after it is drawn: a card sheet's facts, price line, copies, binders and
 * facets, a set page's rows, the lists warmed for the next tab, Home's movers. Each answers exactly
 * what the server action of the same name answers, and the client asks them through `@/lib/reads`.
 *
 * Routes and not server actions, for the reason /api/sidebar-counts is one. Next runs a page's
 * actions one at a time, so a sheet's four to six reads ran in a row (POSTs at +0, +694, +417 and
 * +293 ms in production, 2026-09-16), the sheet took 1.4 s to fill, and a star pressed meanwhile
 * waited behind all of them. Fetches run side by side and hold back no write.
 *
 * Every answer is the caller's own, found from their session; nobody else's id or token is taken
 * from the address. No session is a 401, which the client reads as the same soft failure the
 * action gave a signed-out visitor (a public profile's sheet). Nothing here writes, so a GET
 * another site makes a browser send can learn nothing it can read back and change nothing.
 */

/** The single values of an address's query, for a schema to read. */
const params = (q: URLSearchParams) => Object.fromEntries(q.entries());

const text = z.string().min(1).max(200);
const language = z.enum(["en", "ja"]).optional();

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
    folders: () => getFolderChoices(),
    facets: () => loadFacets(),
    "warm-list": (q) => warmList(params(q)).then(() => null),
    movers: (q) => {
        const p = z.object({ period: z.enum(PERIODS.map((x) => x.key) as [string, ...string[]]) }).safeParse(params(q));
        return p.success ? moversFor(p.data.period as (typeof PERIODS)[number]["key"]) : null;
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
