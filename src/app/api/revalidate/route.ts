import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { publicTag, userTag } from "@/lib/user-cache";

/**
 * The Card Orb API's word that a person's profile changed through it (the iOS app's write), so
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

    // Expired at once, as `forgetMineLater` does, and never "max". A tag keeps one expiry, and the
    // last call sets it: the API calls this after every write, including the ones this app's own
    // tiles make, so a "max" here landed a moment after /api/forget-mine had expired the tag and
    // pushed that expiry a year out. The tag was then only stale, and the next read was handed the
    // answer from before the write while the fresh one was fetched behind it: a set page reloaded
    // right after a plus and a second copy said "not in your collection" (1 round in 3, e2e probe
    // on web#676, 2026-09-17).
    revalidateTag(publicTag(parsed.data.username), { expire: 0 });
    revalidateTag(userTag(parsed.data.userId), { expire: 0 });
    return new Response(null, { status: 204 });
}
