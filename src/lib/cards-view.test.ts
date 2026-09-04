import { describe, expect, it } from "vitest";
import { parseCardsView } from "./cards-view";

describe("parseCardsView", () => {
    it("is grid only when the cookie says so, table otherwise", () => {
        expect(parseCardsView("grid")).toBe("grid");
        expect(parseCardsView("table")).toBe("table");
        expect(parseCardsView(undefined)).toBe("table");
        expect(parseCardsView("anything")).toBe("table");
    });
});
