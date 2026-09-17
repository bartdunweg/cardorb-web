import { api } from "@/lib/api";
import { type Mover, moversAnswer } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { Mover } from "@/lib/api-shapes";

/** The periods the API answers movers for, as the value chart names its own. */
export type MoversPeriod = "7" | "30" | "91" | "182" | "all";

/**
 * The collection's biggest price moves over a period, up and down (GET /v1/movers). Kept five minutes
 * per person like the value line it sits under: prices change once a night.
 */
export async function getMovers(period: MoversPeriod): Promise<{ up: Mover[]; down: Mover[] }> {
    return perUser("value", `movers:${period}`, (token) => api(`/movers?days=${period}`, { token, schema: moversAnswer }));
}
