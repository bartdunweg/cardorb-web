"use client";

import { ViewMenu } from "@/components/app/view-menu";
import { useCardsView } from "@/hooks/use-cards-view";
import type { CardsGroup, CardsSize, CardsViewMode } from "@/lib/cards-view";

/**
 * The View menu in a phone's bar, beside the dots, where a list page has one (Bart's call,
 * 2026-09-18): the row under the search is then the filters alone. The list's own View menu steps
 * off the row on a phone (`max-sm:hidden`), and this one is not drawn from sm, where the row has
 * room for it. Both read the same choice (`useCardsView`), so either one moves the list.
 */
export function BarViewMenu({
    initialView,
    initialSize,
    initialGroup,
    layouts = true,
    grouped = false,
}: {
    initialView: CardsViewMode;
    initialSize: CardsSize;
    initialGroup: CardsGroup;
    /** Grid and list both; a Pokédex is only ever a grid. */
    layouts?: boolean;
    /** Sorted by set, so the set headings can be switched. */
    grouped?: boolean;
}) {
    const { view, size, group } = useCardsView(layouts ? initialView : "grid", initialSize, initialGroup);
    return <ViewMenu view={layouts ? view : "grid"} size={size} layouts={layouts} group={grouped ? group : undefined} className="sm:hidden" />;
}
