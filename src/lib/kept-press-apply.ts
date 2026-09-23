import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { addCard } from "@/app/(app)/dashboard/cards/actions";
import type { PokemonCard } from "@/lib/api-shapes";
import { forgetTags } from "@/lib/cache-scopes";
import { KEPT_PRESS_COOKIE, KEPT_PRESS_DONE_COOKIE, type KeptPressDone, readKeptPress } from "@/lib/kept-press";

/**
 * Carry a visitor's kept press through, at the moment they become somebody.
 *
 * Called where a session is made (signing in, signing up with an immediate session, confirming
 * the address), not on the first page with a session. Those places know it happened and run once;
 * a check on every page would have to guess whether it had already been done.
 *
 * The cookie is cleared first, before the write is tried. It can then never apply twice, whatever
 * the write does: a failed write is not retried on every page for half an hour, it is told once.
 *
 * `forget` drops the reader's caches so the page they land on shows the card where they put it.
 * Only a server action may do that (updateTag); the confirm route passes false, and needs nothing
 * dropped, because an account made a moment ago has nothing cached.
 */
export async function applyKeptPress({ token, userId, forget }: { token: string; userId: string; forget: boolean }): Promise<KeptPressDone | null> {
    const store = await cookies();
    const raw = store.get(KEPT_PRESS_COOKIE)?.value;
    if (!raw) return null;
    store.delete(KEPT_PRESS_COOKIE);

    const press = readKeptPress(raw);
    if (!press) return null;

    // The add a tile makes, as this reader. The API matches the card against the catalogues and
    // refuses one that is not a card, so a forged value can only add a real card to this list.
    const card = { ...press.card, id: press.card.tcgId ?? `${press.card.set}-${press.card.number}` } as unknown as PokemonCard;
    const added = await addCard(card, press.target, undefined, { reread: false, token });
    if (added.ok && forget) for (const tag of forgetTags(userId, "cards")) updateTag(tag);

    const done: KeptPressDone = { target: press.target, name: press.card.name, ok: added.ok };
    // Not httpOnly: the page it lands on reads it once in the browser, says it, and removes it.
    store.set(KEPT_PRESS_DONE_COOKIE, JSON.stringify(done), { path: "/", maxAge: 60, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return done;
}
