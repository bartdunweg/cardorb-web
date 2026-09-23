import { describe, expect, it } from "vitest";
import { binderFromPath, isBinderPath } from "./binder-from-path";

const binders = [
    { id: "aaa", name: "Charizards", rule: null },
    { id: "bbb", name: "Kanto", rule: { dex: { from: 1, to: 151 } } },
];

describe("binderFromPath", () => {
    it("names a hand-filled binder from its page", () => {
        expect(binderFromPath("/dashboard/collections/aaa", binders)).toEqual({ id: "aaa", name: "Charizards" });
        expect(binderFromPath("/dashboard/collections/aaa/", binders)).toEqual({ id: "aaa", name: "Charizards" });
    });

    it("is nothing on a rule binder's page: the rule decides what shows", () => {
        expect(binderFromPath("/dashboard/collections/bbb", binders)).toBeNull();
    });

    it("is nothing for a binder the list does not know", () => {
        expect(binderFromPath("/dashboard/collections/zzz", binders)).toBeNull();
        expect(binderFromPath("/dashboard/collections/aaa", [])).toBeNull();
    });

    it("is nothing on the Binders overview and on other pages with an id", () => {
        expect(binderFromPath("/dashboard/collections", binders)).toBeNull();
        expect(binderFromPath("/sets/aaa", binders)).toBeNull();
        expect(binderFromPath("/dashboard/cards", binders)).toBeNull();
    });
});

describe("isBinderPath", () => {
    it("knows a binder's page before the list has answered", () => {
        expect(isBinderPath("/dashboard/collections/aaa")).toBe(true);
        expect(isBinderPath("/dashboard/collections")).toBe(false);
        expect(isBinderPath("/sets/aaa")).toBe(false);
    });
});
