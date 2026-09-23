import type { PokemonCard } from "@/lib/api-shapes";
import type { KeepPressRequest } from "@/lib/kept-press";

/**
 * Ask for a visitor's press to be kept, so signing in carries it through (kept-press.ts says why).
 *
 * Called on the press of a link to sign in, the heart and the plus a visitor sees on a set tile and
 * in the card sheet. The link does the navigating and this does not touch it: nothing is awaited,
 * nothing is prevented, nothing is delayed. `keepalive` is what lets the request finish while the
 * page it was sent from leaves. Without JavaScript the link still signs the person in; only the
 * press is not kept.
 *
 * A link opened in a new tab (a middle click, cmd+click) does not fire a click handler in every
 * browser, so that press may not be kept. That is accepted: the person still arrives signed in,
 * with the card one press away.
 *
 * The card goes as the tile adds it and nothing more: the fields `keepPressRequest` reads, so the
 * request is written one way from every place that makes it.
 */
export function keepPress(target: KeepPressRequest["target"], card: PokemonCard): void {
    const body: KeepPressRequest = {
        target,
        card: {
            name: card.name,
            set: card.set,
            number: card.number,
            rarity: card.rarity,
            types: card.types,
            tcgId: card.tcgId ?? null,
            language: card.language ?? null,
        },
        // The page the press was made on, the same one the invitation returns to (useReturnHrefs
        // reads the pathname too), so a sign-in that continues this journey carries the press.
        from: window.location.pathname,
    };
    try {
        // Fire and forget: a press that was not kept is a press made again after signing in.
        fetch("/api/keep-press", {
            method: "POST",
            keepalive: true,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        }).catch(() => undefined);
    } catch {
        // A browser that refuses the request outright (a keepalive body over its limit): the same.
    }
}
