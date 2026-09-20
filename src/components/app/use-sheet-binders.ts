"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { BinderChoice } from "@/app/(app)/dashboard/collections/actions";
import { binderFromPath, isBinderPath } from "@/lib/binder-from-path";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { isReadFailed, loadFacets, tryListBinders } from "@/lib/reads";

type Params = { card: Card | PublicCard | null; readOnly: boolean };

/** The binders the card sheet files into and names, the facets their rules read, and the binder whose page it is on. */
export function useSheetBinders({ card, readOnly }: Params) {
    const [binders, setBinders] = useState<BinderChoice[]>([]);
    /** The binder list did not answer, which used to look exactly like a list still on its way. */
    const [failed, setFailed] = useState(false);
    /* The hand-filled binder whose page this sheet was opened on, if any: a card taken here goes
       into it as well. Read from the path, the one fact every mounted sheet shares: the palette's
       sheet hangs from the layout, beside the page, out of reach of anything the page provides. */
    const pathname = usePathname();
    const binder = readOnly ? null : binderFromPath(pathname, binders);
    /* On a binder's page before the binder list has answered: the press would file nowhere, so it
       waits a beat. A read that failed is not a beat, it is forever, and the button stayed dead
       while Add to wishlist beside it worked (error-path audit). Waiting ends with the failure;
       the card is then taken into the collection without a binder, and the sheet says so. */
    const bindersFailed = !readOnly && failed && isBinderPath(pathname);
    const binderPending = !readOnly && isBinderPath(pathname) && binders.length === 0 && !failed;
    const [facets, setFacets] = useState<Facets | undefined>(undefined);

    // The binders and the facets are for the sheet's own controls, so they are asked for when a
    // card first opens, not when the page mounts: this sits on every list page, closed, and used
    // to cost two calls on every visit for a sheet nobody had opened.
    const askedForChoices = useRef(false);
    useEffect(() => {
        if (readOnly || !card || askedForChoices.current) return;
        askedForChoices.current = true;
        tryListBinders().then((answer) => (isReadFailed(answer) ? setFailed(true) : setBinders(answer)));
        loadFacets().then(setFacets);
    }, [readOnly, card]);

    return { binders, setBinders, facets, binder, binderPending, bindersFailed };
}
