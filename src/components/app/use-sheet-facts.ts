"use client";

import { useEffect, useState } from "react";
import type { CardFacts, PricePoint } from "@/app/(app)/dashboard/cards/actions";
import { knownCardFacts, knownPriceHistory, knownPriceListings, preloadCardFacts, preloadPriceHistory } from "@/components/app/card-memo";
import type { PeriodKey } from "@/components/app/chart-periods";
import type { PokemonCard } from "@/lib/api-shapes";
import { isReverseFinish } from "@/lib/card-shapes";
import type { Card, PublicCard } from "@/lib/cards";
import { periodChange } from "@/lib/price-change";
import { seriesLogo } from "@/lib/reads";

const NO_LISTINGS: Record<string, number> = {};

type Params = {
    card: Card | PublicCard | null;
    mine: Card | null;
    addable: PokemonCard | null | undefined;
    opensOn: PeriodKey;
};

/**
 * What the card sheet reads about the card rather than about your copies of it: the generation's
 * logo, the catalogue's facts, the price history, and the period its line is drawn over.
 */
export function useSheetFacts({ card, mine, addable, opensOn }: Params) {
    // The generation's logo, asked for when a card opens; kept with the series it was read for.
    const [logo, setLogo] = useState<{ series: string; url: string | null } | null>(null);
    const gen = card?.gen ?? null;
    useEffect(() => {
        if (!gen) return;
        let live = true;
        seriesLogo(gen).then((url) => {
            if (live) setLogo({ series: gen, url });
        });
        return () => {
            live = false;
        };
    }, [gen]);
    const genLogo = logo?.series === gen ? logo.url : null;
    // What the catalogue knows about the printing: read when a card opens, kept with its id.
    //
    // Seeded from the card memo, which is why a card opened twice fills in at once rather than a
    // half-second later with its rows animating: measured, the sheet is on screen at 92 ms and
    // the catalogue answers at 559 ms, and the `arrive` on those rows spends that gap drawing
    // attention to it. The second time there is no gap to draw.
    const [facts, setFacts] = useState<{ tcgId: string; facts: CardFacts | null } | null>(null);
    const [history, setHistory] = useState<{ tcgId: string; points: PricePoint[] } | null>(null);
    const tcgId = card?.tcg_id ?? null;
    /* The catalogue the card is from: a card taken off a Japanese set page says so, and a copy of one
       carries its language. Its facts are asked of that catalogue (card-memo.ts). */
    const catalogue = addable?.language === "ja" || (card && "language" in card && card.language === "ja") ? "ja" : "en";
    useEffect(() => {
        if (!tcgId) return;
        // The price line too, so the price section opens on it rather than on "No readings" for the
        // half second the API takes. The header's arrow reads the same answer, for its average.
        let live = true;
        preloadPriceHistory(tcgId).then((points) => {
            if (live) setHistory({ tcgId, points });
        });
        return () => {
            live = false;
        };
    }, [tcgId]);
    useEffect(() => {
        if (!tcgId) return;
        if (knownCardFacts(tcgId, catalogue) !== undefined) return;
        let live = true;
        preloadCardFacts(tcgId, catalogue).then((f) => {
            if (live) setFacts({ tcgId, facts: f });
        });
        return () => {
            live = false;
        };
    }, [tcgId, catalogue]);
    /*
     * Read from what was fetched, or from what a previous open already learned. Derived rather
     * than copied into state, so a card whose answer is already known needs no effect and no
     * render to show it.
     *
     * That is the whole of it: measured, the sheet is on screen at 63 ms and the catalogue
     * answers at 739 ms, and the `arrive` on those rows spends the gap between drawing attention
     * to it. Opened a second time there is no gap, so nothing animates.
     */
    // The copy forms are told the wait apart from no answer: undefined until the catalogue answers, and they offer nothing yet (copy-fields).
    const formFacts = tcgId ? (facts?.tcgId === tcgId ? facts.facts : knownCardFacts(tcgId, catalogue)) : null;
    const known = formFacts ?? null;
    // The line beside the price in the header: how far this printing moved over the period the
    // chart under it is drawing, out of the card's own history. The period lives here rather than
    // in the chart, so pressing 7D moves the number and the line together.
    const points = tcgId ? (history?.tcgId === tcgId ? history.points : (knownPriceHistory(tcgId) ?? [])) : [];
    // Read with the line: the lowest listing of each printing that has none (cardorb-api#561).
    const listings = (tcgId ? knownPriceListings(tcgId) : undefined) ?? NO_LISTINGS;
    const [periodState, setPeriodState] = useState<{ opensOn: PeriodKey; period: PeriodKey }>({ opensOn, period: opensOn });
    // A list with a period of its own (Home's movers) opens every card it hands over on that one.
    if (periodState.opensOn !== opensOn) setPeriodState({ opensOn, period: opensOn });
    const period = periodState.period;
    const setPeriod = (next: PeriodKey) => setPeriodState({ opensOn, period: next });
    const change = mine ? periodChange(points, period, isReverseFinish(mine.finish), mine.price_printing ?? null) : null;

    return { tcgId, genLogo, formFacts, known, points, listings, period, setPeriod, change };
}
