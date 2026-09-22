import { describe, expect, it } from "vitest";
import type { SetSeries, SetSummary } from "./api-shapes";
import {
    type BrowseQuery,
    browseHref,
    progressShelf,
    readBrowseQuery,
    searchShelf,
    seriesShelf,
    shelfCounts,
    shelfFacets,
    shelfHasHoldings,
    sortShelf,
    yearShelf,
} from "./browse-query";

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

/** A set on a shelf read without a session: the catalogue's own fields and no holdings at all. */
const unasked = (name: string, total: number): SetSummary => ({ ...set(name), total, owned: null, complete: null });

// As the API hands them: newest series first, newest set first in each.
const shelf: SetSeries[] = [
    { name: "Scarlet & Violet", sets: [set("Surging Sparks"), set("Obsidian Flames")] },
    { name: "Base", sets: [set("Jungle"), set("Base Set")] },
];

describe("readBrowseQuery", () => {
    it("reads nonsense as English, newest first", () => {
        expect(readBrowseQuery({})).toEqual({ language: "en", sort: "newest", progress: "all", q: undefined, series: [], year: [] });
        expect(readBrowseQuery({ language: "xx", sort: "sideways", progress: "half", q: "  " })).toEqual({
            language: "en",
            sort: "newest",
            progress: "all",
            q: undefined,
            series: [],
            year: [],
        });
        expect(readBrowseQuery({ language: "ja", sort: "name", progress: "complete", q: " Jungle " })).toEqual({
            language: "ja",
            sort: "name",
            progress: "complete",
            q: "Jungle",
            series: [],
            year: [],
        });
    });
});

describe("browseHref", () => {
    it("keeps the defaults out of the URL", () => {
        const en = { language: "en", sort: "newest", progress: "all", q: undefined, series: [], year: [] } as BrowseQuery;
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

    // Nobody was asked what is held, so there is no progress to narrow by. An empty shelf would
    // read as "you have started none of these", which is a claim about a collection never read.
    it("leaves a shelf nobody was asked about whole, whatever the choice", () => {
        const unmarked: SetSeries[] = [{ name: "Base", sets: [unasked("Jungle", 64), unasked("Base Set", 102)] }];
        for (const progress of ["started", "complete", "new"] as const) expect(progressShelf(unmarked, progress)).toBe(unmarked);
    });

    it("offers no progress filter for a shelf nobody was asked about", () => {
        const unmarked: SetSeries[] = [{ name: "Base", sets: [unasked("Jungle", 64)] }];
        expect(shelfHasHoldings(unmarked)).toBe(false);
        expect(shelfFacets(unmarked).holdings).toBe(false);
        expect(shelfHasHoldings(mixed)).toBe(true);
    });
});

describe("shelfCounts", () => {
    const at = (name: string, owned: number, total: number): SetSummary => ({ ...set(name), owned, total, complete: total > 0 && owned >= total });
    const mixed: SetSeries[] = [
        { name: "Scarlet & Violet", sets: [at("Surging Sparks", 0, 191), at("Obsidian Flames", 40, 197)] },
        { name: "Base", sets: [at("Jungle", 64, 64), at("Unrecorded", 0, 0)] },
    ];

    it("counts each progress over the whole shelf, and the total is the one chosen", () => {
        // All keeps the set with no cards recorded; the three states leave it out, so they need not add up to all.
        expect(shelfCounts(mixed, { q: undefined, progress: "complete", series: [], year: [] })).toMatchObject({
            total: 1,
            progress: { all: 4, started: 1, complete: 1, new: 1 },
        });
    });

    it("counts what the search leaves", () => {
        expect(shelfCounts(mixed, { q: "flames", progress: "all", series: [], year: [] })).toMatchObject({
            total: 1,
            progress: { all: 1, started: 1, complete: 0, new: 0 },
        });
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

describe("series and year", () => {
    const dated = (name: string, releaseDate: string | null, owned = 0, total = 10): SetSummary => ({ ...set(name), releaseDate, owned, total });
    const years: SetSeries[] = [
        { name: "Scarlet & Violet", sets: [dated("Surging Sparks", "2024-11-08", 3), dated("Scarlet & Violet", "2023-03-31")] },
        { name: "Base", sets: [dated("Jungle", "1999-06-16", 10), dated("Base Set", "1999-01-09"), dated("Undated", null)] },
    ];

    it("reads repeated series and four-digit years, and writes them back", () => {
        const query = readBrowseQuery({ series: ["Base", " Base ", "Scarlet & Violet"], year: ["1999", "99", "2024"] });
        expect(query.series).toEqual(["Base", "Scarlet & Violet"]);
        expect(query.year).toEqual(["1999", "2024"]);
        expect(browseHref(query, {})).toBe("/dashboard/sets?series=Base&series=Scarlet+%26+Violet&year=1999&year=2024");
    });

    it("keeps the chosen series, and every series when none is chosen", () => {
        expect(seriesShelf(years, ["Base"]).map((g) => g.name)).toEqual(["Base"]);
        expect(seriesShelf(years, [])).toBe(years);
    });

    it("keeps the sets of the chosen years; a set with no date is in no year", () => {
        expect(yearShelf(years, ["1999"]).flatMap((g) => g.sets.map((s) => s.name))).toEqual(["Jungle", "Base Set"]);
        expect(yearShelf(years, ["2023", "2024"]).map((g) => g.name)).toEqual(["Scarlet & Violet"]);
    });

    it("offers the shelf's series in its order and its years newest first", () => {
        expect(shelfFacets(years)).toEqual({ series: ["Scarlet & Violet", "Base"], years: ["2024", "2023", "1999"], holdings: true });
    });

    it("counts each series and year with the other filters as they are, not itself", () => {
        const counts = shelfCounts(years, { q: undefined, progress: "started", series: ["Base"], year: [] });
        // In progress: Surging Sparks (3 of 10). Series counts ignore the Base choice, so Scarlet & Violet still counts 1.
        expect(counts.series).toEqual({ "Scarlet & Violet": 1 });
        // Year counts keep the Base choice: nothing in Base is in progress.
        expect(counts.year).toEqual({});
        expect(counts.total).toBe(0);
    });
});
