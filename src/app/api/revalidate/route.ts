import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { publicTag, userTag } from "@/lib/user-cache";

/**
 * The Card Orb API's word that a person's profile changed through it — the iOS app's write — so
 * this app drops what it remembers of them: the public page under their name and their own
 * dashboard, both kept five minutes otherwise (`forgetMine` does the same after a write made
 * here). Until this route, a profile switched to private in the app stayed open on cardorb.com
 * for the rest of those minutes.
 *
 * Not under /api/v1, which vercel.json hands to the API. Behind a shared secret the API carries
 * as a bearer token and nobody else has; compared in constant time, and a wrong one is a 401
 * that says no more than that. Unconfigured, the route refuses everything: an open door that
 * only empties a cache is still a door.
 */
const body = z.object({ username: z.string().trim().min(1).max(64), userId: z.string().uuid() });

export async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET?.trim();
    if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });
    const offered = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const a = Buffer.from(offered);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

    // "max" is the profile a route handler may name; the entries these tags cover are
    // `unstable_cache` ones, which a revalidated tag turns into a miss on the next read.
    revalidateTag(publicTag(parsed.data.username), "max");
    revalidateTag(userTag(parsed.data.userId), "max");
    return new Response(null, { status: 204 });
}
