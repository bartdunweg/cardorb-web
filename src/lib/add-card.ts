import { z } from "zod";
import { api } from "@/lib/api";
import { EDITIONS, type Edition, FINISHES, type Finish, type FoilPattern, type PokemonCard } from "@/lib/api-shapes";
import { writeFailure } from "@/lib/write-failure";
import type { FailedWrite } from "@/lib/write-outcome";

/**
 * Adding a catalogue card to a collection or a wishlist, the work behind the addCard action.
 *
 * Here and not in the actions file because of `token`. Every export of a "use server" file is an
 * action any browser can call with arguments of its choosing, and a bearer token is not an
 * argument a stranger should be handed a slot for, even where it would gain them nothing (a caller
 * who holds a token can call the API directly). This module is plain server code: the action
 * calls it without a token, and the one caller that has a reader's token before the request does
 * (carrying a kept press through at sign-in, kept-press-apply.ts) calls it with one.
 *
 * Nothing is forgotten here; the caller decides what to drop, since the action and sign-in know
 * different things about the reader.
 */

const cardSchema = z.object({
    name: z.string().trim().min(1),
    set: z.string().trim().min(1, "That card has no set."),
    number: z.string().trim(),
    rarity: z.string().nullable(),
    types: z.array(z.string()).nullable(),
    /**
     * The catalogue's own id, and which catalogue it belongs to.
     *
     * Both may be missing or null: everything added before today has neither and the API still
     * resolves those by set name, and a set tile carries null for what its shelf did not send.
     * They are how a card from the Japanese shelf is findable at all: those
     * sets have no English name, so the name the API would look up does not exist. Together they
     * say "this row is that card, in that catalogue" (cardorb-api#257).
     *
     * `nullish`, not `optional`: an English tile sends `language: null`, and `optional` refused
     * that as "expected string, received null": every add from every set page, since #308.
     */
    tcgId: z.string().trim().min(1).nullish(),
    language: z.string().trim().min(2).max(5).nullish(),
});

const addedAnswer = z.object({ id: z.string().optional() });

type Result = { ok: true; id?: string } | FailedWrite;

export async function addCardAs(
    input: PokemonCard,
    target: "collection" | "wishlist" = "collection",
    collectionId?: string,
    {
        printing,
        edition,
        token,
    }: {
        /** The printing pressed in the card's sheet; left out, the API picks the card's default finish. */
        printing?: { finish: Finish; foilPattern: FoilPattern | null };
        edition?: Edition;
        /** The reader's token, where the request does not carry it yet. Left out, api() finds it. */
        token?: string;
    } = {},
): Promise<Result> {
    const parsed = cardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const c = parsed.data;
    const wishlist = target === "wishlist";
    // The new row's id, so a caller can offer to take the add back. Optional: the API has
    // answered with it since the route was written, but an add that worked is still an add
    // without it, just one with no way back.
    let id: string | undefined;
    try {
        const answer = await api("/cards", {
            method: "POST",
            ...(token ? { token } : {}),
            body: {
                name: c.name,
                set: c.set,
                number: c.number,
                ...(c.rarity ? { rarity: c.rarity } : {}),
                // Only when the card came from another language's shelf. An English card carries
                // neither and is resolved the way every row before it was.
                ...(c.tcgId ? { tcgId: c.tcgId } : {}),
                ...(c.language && c.language !== "en" ? { language: c.language } : {}),
                types: c.types ?? [],
                ...(printing && (FINISHES as readonly string[]).includes(printing.finish) ? { finish: printing.finish } : {}),
                ...(printing?.foilPattern ? { foilPattern: printing.foilPattern } : {}),
                ...(edition && (EDITIONS as readonly string[]).includes(edition) ? { edition } : {}),
                collection: !wishlist,
                // Added from a binder's own page: filed in it at once.
                ...(collectionId && !wishlist && z.string().uuid().safeParse(collectionId).success ? { collectionId } : {}),
            },
            schema: addedAnswer,
        });
        id = answer.id;
    } catch (err) {
        return writeFailure(err);
    }

    return { ok: true, id };
}
