import { describe, expect, it } from "vitest";
import { parseCardsView } from "./cards-view";

describe("parseCardsView", () => {
    it("is table only when the cookie says so, grid otherwise", () => {
        expect(parseCardsView("grid")).toBe("grid");
        expect(parseCardsView("table")).toBe("table");
        expect(parseCardsView(undefined)).toBe("grid");
        expect(parseCardsView("anything")).toBe("grid");
    });
});
