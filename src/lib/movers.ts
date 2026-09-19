import { api } from "@/lib/api";
import { type Mover, moversAnswer } from "@/lib/api-shapes";
import type { HomeList } from "@/lib/home-list";
import { perUser } from "@/lib/user-cache";

export type { Mover } from "@/lib/api-shapes";

/** The periods the API answers movers for, as the value chart names its own. */
export type MoversPeriod = "7" | "30" | "91" | "182" | "all";

/**
 * A list's biggest price moves over a period, up and down (GET /v1/movers): the collection's, or the
 * wishlist's, the favorites' or one binder's by `?folder=` (api#568), as the value line takes it.
 * Kept five minutes per person like that line: prices change once a night.
 */
export async function getMovers(period: MoversPeriod, list: HomeList = "all"): Promise<{ up: Mover[]; down: Mover[] }> {
    const folder = list === "all" ? "" : `&folder=${encodeURIComponent(list)}`;
    return perUser("value", `movers:${list}:${period}`, (token) => api(`/movers?days=${period}${folder}`, { token, schema: moversAnswer }));
}
