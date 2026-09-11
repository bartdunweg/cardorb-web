import { describe, expect, it } from "vitest";
import { binderFromPath, isBinderPath } from "./binder-from-path";

const folders = [
    { id: "aaa", name: "Charizards", rule: null },
    { id: "bbb", name: "Kanto", rule: { dex: { from: 1, to: 151 } } },
];

describe("binderFromPath", () => {
    it("names a hand-filled binder from its page", () => {
        expect(binderFromPath("/dashboard/collections/aaa", folders)).toEqual({ id: "aaa", name: "Charizards" });
        expect(binderFromPath("/dashboard/collections/aaa/", folders)).toEqual({ id: "aaa", name: "Charizards" });
    });

    it("is nothing on a rule binder's page: the rule decides what shows", () => {
        expect(binderFromPath("/dashboard/collections/bbb", folders)).toBeNull();
    });

    it("is nothing for a binder the list does not know", () => {
        expect(binderFromPath("/dashboard/collections/zzz", folders)).toBeNull();
        expect(binderFromPath("/dashboard/collections/aaa", [])).toBeNull();
    });

    it("is nothing on the Binders overview and on other pages with an id", () => {
        expect(binderFromPath("/dashboard/collections", folders)).toBeNull();
        expect(binderFromPath("/dashboard/sets/aaa", folders)).toBeNull();
        expect(binderFromPath("/dashboard/cards", folders)).toBeNull();
    });
});

describe("isBinderPath", () => {
    it("knows a binder's page before the list has answered", () => {
        expect(isBinderPath("/dashboard/collections/aaa")).toBe(true);
        expect(isBinderPath("/dashboard/collections")).toBe(false);
        expect(isBinderPath("/dashboard/sets/aaa")).toBe(false);
    });
});
