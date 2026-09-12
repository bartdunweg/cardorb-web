import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DexCard } from "@/lib/api-shapes";
import type { DexGeneration, NamedDexSlot } from "@/lib/dex-groups";
import { DexGrid } from "./dex-grid";

/*
 * A slot says two things, and they are about two different subjects: above the picture the
 * Pokémon (its name, its number, how many cards you hold of it), under the picture the card in
 * view (its set and its price). A slot you hold nothing of has no card to describe.
 */

const dexCard = (id: string, over: Partial<DexCard> = {}): DexCard => ({
    id,
    name: "Pikachu",
    set: "Base Set",
    number: "58",
    imageUrl: null,
    imageHighUrl: null,
    price: null,
    isFace: false,
    ...over,
});

const slot = (number: number, cards: DexCard[], name = "Pikachu"): NamedDexSlot => ({ number, name, artwork: null, cards });

const generation = (slots: NamedDexSlot[]): DexGeneration => ({
    label: "Generation I",
    from: 1,
    to: 151,
    slots,
    caught: slots.filter((s) => s.cards.length > 0).length,
    total: slots.length,
});

describe("DexGrid", () => {
    it("writes the Pokémon above the picture and the card in view below it", () => {
        render(<DexGrid generations={[generation([slot(25, [dexCard("a", { price: 12.5 })])])]} linked={false} />);
        expect(screen.getByText("Pikachu")).toBeInTheDocument();
        expect(screen.getByText("#025")).toBeInTheDocument();
        expect(screen.getByText("Base Set")).toBeInTheDocument();
        expect(screen.getByText("€12.50")).toBeInTheDocument();
    });

    it("counts the cards of a slot that holds several, above the picture", () => {
        render(<DexGrid generations={[generation([slot(25, [dexCard("a"), dexCard("b")])])]} linked={false} />);
        expect(screen.getByText("#025 · 2 cards")).toBeInTheDocument();
    });

    it("says a slot is missing, and writes no price under it", () => {
        render(<DexGrid generations={[generation([slot(1, [], "Bulbasaur")])]} linked={false} />);
        expect(screen.getByText("Missing")).toBeInTheDocument();
        expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    });
});
