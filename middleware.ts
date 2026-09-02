import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    // Run on all routes except static assets, image files and /api. Everything under /api/v1 is
    // rewritten to the previous Cardorb app (see vercel.json), so a session refresh there is wasted.
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
