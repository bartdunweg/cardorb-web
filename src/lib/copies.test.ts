import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api-shapes";
import { groupCopies } from "./copies";

const copy = (over: Partial<Card> = {}): Card =>
    ({
        id: Math.random().toString(36).slice(2),
        name: "Fomantis",
        set: "Pitch Black",
        number: "085",
        language: "en",
        finish: "holo",
        foil_pattern: null,
        condition: "Near Mint",
        grade: null,
        collection_id: null,
        quantity: 1,
        ...over,
    }) as unknown as Card;

describe("groupCopies", () => {
    it("counts copies that differ in nothing as one line", () => {
        // The four rows in the screenshot: Holo · Near Mint, €2.81, ×1, four times.
        const groups = groupCopies([copy(), copy(), copy(), copy()]);

        expect(groups).toHaveLength(1);
        expect(groups[0].quantity).toBe(4);
        expect(groups[0].rows).toHaveLength(4);
    });

    it("keeps copies apart when anything about them differs", () => {
        const groups = groupCopies([
            copy(),
            copy({ condition: "Excellent" }),
            copy({ language: "de" }),
            copy({ finish: "reverse-holo" }),
            copy({ foil_pattern: "cosmos" }),
            copy({ grade: "PSA 10" }),
            copy({ collection_id: "11111111-1111-1111-1111-111111111111" }),
        ]);

        expect(groups).toHaveLength(7);
    });

    it("sums the quantities rather than counting the rows", () => {
        // A row already holding three, beside a row of one: four copies on one line.
        expect(groupCopies([copy({ quantity: 3 }), copy()])[0].quantity).toBe(4);
    });

    it("carries every row behind the line, so removing it can remove them all", () => {
        const rows = [copy(), copy()];
        expect(
            groupCopies(rows)[0]
                .rows.map((r) => r.id)
                .sort(),
        ).toEqual(rows.map((r) => r.id).sort());
    });
});
