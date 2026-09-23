import { api } from "@/lib/api";
import { type Mover, marketMoversAnswer, moverFromMarket } from "@/lib/api-shapes";
import { CATALOGUE_TAG } from "@/lib/cache-scopes";

/**
 * The week's biggest price moves across the whole catalogue, for a visitor's Home.
 *
 * Asked without a token on purpose: the answer is the same for everybody, so it belongs in the one
 * shared entry of the Data Cache under the catalogue's tag, not in an entry per reader. Null where it
 * could not be read, so the page keeps its empty frames rather than showing a list that says nothing
 * moved.
 */
export async function getMarketMovers(): Promise<{ up: Mover[]; down: Mover[] } | null> {
    try {
        const { up, down } = await api("/catalog/movers", { auth: false, tags: [CATALOGUE_TAG], schema: marketMoversAnswer });
        return { up: up.map(moverFromMarket), down: down.map(moverFromMarket) };
    } catch (err) {
        console.error("The market movers could not be read:", err instanceof Error ? err.message : err);
        return null;
    }
}
