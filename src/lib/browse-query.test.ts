import { describe, expect, it } from "vitest";
import type { SetSeries, SetSummary } from "./api-shapes";
import { browseHref, progressShelf, readBrowseQuery, searchShelf, sortShelf } from "./browse-query";

const set = (name: string): SetSummary => ({
    id: name.toLowerCase(),
    name,
    localName: null,
    series: "",
    releaseDate: null,
    logoUrl: null,
    symbolUrl: null,
    colors: [],
    owned: 0,
    total: 0,
    complete: false,
    cardsRecorded: true,
});

// As the API hands them: newest series first, newest set first in each.
const shelf: SetSeries[] = [
    { name: "Scarlet & Violet", sets: [set("Surging Sparks"), set("Obsidian Flames")] },
    { name: "Base", sets: [set("Jungle"), set("Base Set")] },
];

describe("readBrowseQuery", () => {
    it("reads nonsense as English, newest first", () => {
        expect(readBrowseQuery({})).toEqual({ language: "en", sort: "newest", progress: "all", q: undefined });
        expect(readBrowseQuery({ language: "xx", sort: "sideways", progress: "half", q: "  " })).toEqual({
            language: "en",
            sort: "newest",
            progress: "all",
            q: undefined,
        });
        expect(readBrowseQuery({ language: "ja", sort: "name", progress: "complete", q: " Jungle " })).toEqual({
            language: "ja",
            sort: "name",
            progress: "complete",
            q: "Jungle",
        });
    });
});

describe("browseHref", () => {
    it("keeps the defaults out of the URL", () => {
        const en = { language: "en", sort: "newest", progress: "all", q: undefined } as const;
        expect(browseHref(en, {})).toBe("/dashboard/sets");
        expect(browseHref(en, { sort: "oldest" })).toBe("/dashboard/sets?sort=oldest");
        expect(browseHref(en, { progress: "started" })).toBe("/dashboard/sets?progress=started");
        expect(browseHref({ ...en, language: "ja", sort: "name" }, { sort: "newest" })).toBe("/dashboard/sets?language=ja");
        expect(browseHref({ ...en, language: "ja", sort: "name", q: "base" }, {})).toBe("/dashboard/sets?q=base&language=ja&sort=name");
    });
});

describe("searchShelf", () => {
    it("keeps the sets whose name has the term, case aside, and drops a series with none", () => {
        const hit = searchShelf(shelf, "JUNG");
        expect(hit.map((g) => [g.name, g.sets.map((s) => s.name)])).toEqual([["Base", ["Jungle"]]]);
        expect(searchShelf(shelf, "")).toBe(shelf);
        expect(searchShelf(shelf, undefined)).toBe(shelf);
        expect(searchShelf(shelf, "zzz")).toEqual([]);
    });

    it("finds a set by its local name too", () => {
        const ja: SetSeries[] = [{ name: "Original", sets: [{ ...set("Pokémon Jungle"), localName: "ポケモンジャングル" }] }];
        expect(searchShelf(ja, "ジャングル")[0]!.sets).toHaveLength(1);
    });
});

describe("progressShelf", () => {
    const at = (name: string, owned: number, total: number): SetSummary => ({ ...set(name), owned, total, complete: total > 0 && owned >= total });
    const mixed: SetSeries[] = [
        { name: "Scarlet & Violet", sets: [at("Surging Sparks", 0, 191), at("Obsidian Flames", 40, 197)] },
        { name: "Base", sets: [at("Jungle", 64, 64), at("Unrecorded", 0, 0)] },
    ];
    const names = (series: SetSeries[]) => series.flatMap((g) => g.sets.map((s) => s.name));

    it("all is the shelf as it came", () => {
        expect(progressShelf(mixed, "all")).toBe(mixed);
    });

    it("keeps the sets that far along, and drops a series with none", () => {
        expect(names(progressShelf(mixed, "started"))).toEqual(["Obsidian Flames"]);
        expect(names(progressShelf(mixed, "complete"))).toEqual(["Jungle"]);
        expect(names(progressShelf(mixed, "new"))).toEqual(["Surging Sparks"]);
        expect(progressShelf(mixed, "complete").map((g) => g.name)).toEqual(["Base"]);
    });
});

describe("sortShelf", () => {
    it("newest first is the shelf as the API lists it", () => {
        expect(sortShelf(shelf, "newest")).toBe(shelf);
    });

    it("oldest first turns the series around, and the sets inside each", () => {
        const names = sortShelf(shelf, "oldest").map((g) => [g.name, g.sets.map((s) => s.name)]);
        expect(names).toEqual([
            ["Base", ["Base Set", "Jungle"]],
            ["Scarlet & Violet", ["Obsidian Flames", "Surging Sparks"]],
        ]);
        // The shelf handed in is left as it was.
        expect(shelf[0]!.sets[0]!.name).toBe("Surging Sparks");
    });

    it("name is one list A to Z, in a group with no name", () => {
        const groups = sortShelf(shelf, "name");
        expect(groups.map((g) => g.name)).toEqual([""]);
        expect(groups[0]!.sets.map((s) => s.name)).toEqual(["Base Set", "Jungle", "Obsidian Flames", "Surging Sparks"]);
        expect(sortShelf([], "name")).toEqual([]);
    });
});
