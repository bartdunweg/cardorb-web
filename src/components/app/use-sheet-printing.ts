"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import type { CardFacts, PricePoint } from "@/app/(app)/dashboard/cards/actions";
import { preloadCardImage } from "@/components/app/card-image";
import type { PeriodKey } from "@/components/app/chart-periods";
import { editionChoices, openingChoice, pressedPrinting, printingChoices } from "@/components/app/printing-choices";
import type { StepFrom } from "@/components/app/step-motion";
import type { Finish } from "@/lib/card-shapes";
import type { Card, PublicCard } from "@/lib/cards";
import { type PriceChange, periodChange } from "@/lib/price-change";

type Params = {
    card: Card | PublicCard | null;
    mine: Card | null;
    readOnly: boolean;
    tcgId: string | null;
    known: CardFacts | null;
    points: PricePoint[];
    period: PeriodKey;
    said: string;
    change: PriceChange | null;
    stepFromRef: RefObject<StepFrom>;
    /** Where the card has no copy: the printing the tile that opened it showed, else the first. */
    tilePrinting?: string | null;
};

/**
 * The printing or print run on show in the card sheet, the one pressed under the card, and the
 * picture and price that follow it.
 */
export function useSheetPrinting({ card, mine, readOnly, tcgId, known, points, period, said, change, stepFromRef, tilePrinting }: Params) {
    /*
     * The printing on show, under the card (printing-choices.ts): the copy's own to begin with,
     * and whichever button was pressed after that, until the sheet moves to another card. A
     * printing with its own photo shows that photo; any other shows the card's scan with that
     * printing's foil over it.
     */
    const printings = printingChoices(known);
    const editions = editionChoices(known?.editions, known?.editionPictures);
    // The printings' and the runs' own pictures fetched as soon as the sheet knows them, at the sizes the head and the
    // frame draw, so pressing one swaps the card at once instead of after its download.
    // A cosmos print's shine is three textures (268 KB) the vendored effect only asks for once it is on
    // screen, so the first press of Cosmos waited for those too.
    const printingImages = [...(printings ?? []), ...(editions ?? [])].flatMap((p) => (p.image ? [p.image] : [])).join("|");
    const hasCosmos = !!printings?.some((p) => p.foilPattern === "cosmos");
    useEffect(() => {
        for (const image of printingImages ? printingImages.split("|") : []) {
            preloadCardImage(image, 176, 75);
            preloadCardImage(image, 64, 60);
        }
        if (hasCosmos)
            for (const texture of ["cosmos-bottom.png", "cosmos-middle-trans.png", "cosmos-top-trans.png"]) new window.Image().src = `/holo/${texture}`;
    }, [printingImages, hasCosmos]);
    // On a public page the card's own printing is the one it opens on, as it is for its owner.
    const held = mine ?? (readOnly ? card : null);
    const ownPrinting = held?.finish ? (held.foil_pattern ? `${held.finish}/${held.foil_pattern}` : held.finish) : null;
    const [picked, setPicked] = useState<{ tcgId: string | null; printing: string | null; edition: string | null }>({
        tcgId: null,
        printing: null,
        edition: null,
    });
    const pickedHere = picked.tcgId === tcgId ? picked : null;
    const openingPrinting = openingChoice(printings, ownPrinting, tilePrinting ?? undefined);
    // A card you do not hold opens on its unlimited run, not on the 1st Edition's price.
    const openingEdition = openingChoice(editions, mine?.edition, "unlimited");
    const printingKey = pickedHere?.printing ?? openingPrinting;
    const editionKey = pickedHere?.edition ?? openingEdition;
    const printing = printings?.find((p) => p.key === printingKey) ?? null;
    const editionChoice = editions?.find((e) => e.key === editionKey) ?? null;
    const edition = editionChoice?.key ?? null;
    // A run's own picture shows as a printing's does; a card has one group or the other, never both.
    const pressedImage = printing?.image ?? editionChoice?.image ?? null;
    const pick = (next: { printing?: string; edition?: string }) => {
        // A printing is not a step through the list: the new picture fades in where it is.
        stepFromRef.current = { dir: 0, key: false, repeat: false };
        setPicked({ tcgId, printing: next.printing ?? printingKey, edition: next.edition ?? editionKey });
    };
    /*
     * The price above follows the buttons (Bart, 2026-09-15). On the printing the sheet opened on it
     * is the copy's own price, as before; another one reads that printing's latest figure from the
     * card's history, or a pattern print's own figure. `undefined` is "the copy's price", null is
     * "that printing has none".
     */
    const pressedAway = (printing && printingKey !== openingPrinting) || (editionKey && editionKey !== openingEdition);
    const patternPrice = printing?.foilPattern
        ? known?.patternPrints?.prints.find((p) => p.finish === printing.finish && p.foilPattern === printing.foilPattern)?.price?.market
        : undefined;
    /* A public card with no price field is one whose owner keeps prices private: another printing
       pressed there must not bring a market figure in through the catalogue's history. */
    const pricesHidden = readOnly && !(card && "price" in card);
    const { series: shownSeries, price: pressedPrice } = pressedPrinting({
        pressedAway: !!pressedAway,
        finish: printing?.finish ?? (mine?.finish as Finish | null) ?? "normal",
        edition,
        foilPattern: printing?.foilPattern ?? null,
        latest: points.at(-1)?.printings,
        patternPrice,
    });
    const shownPrice = pricesHidden ? undefined : pressedPrice;
    const shownChange = pressedAway ? (shownPrice != null && shownSeries ? periodChange(points, period, false, shownSeries, said) : null) : change;
    // On a public page the card carries a price only where its owner shows them; that is the figure under the title then.
    const publicPrice = readOnly && card && "price" in card ? (card.price ?? null) : null;

    return { printings, editions, printingKey, editionKey, printing, edition, pressedImage, pick, shownSeries, shownPrice, shownChange, publicPrice };
}
