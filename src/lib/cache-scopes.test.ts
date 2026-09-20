import { describe, expect, it } from "vitest";
import {
    CACHE_SCOPES,
    FORGETS,
    PARTED_SCOPES,
    forgetSetSchema,
    forgetTags,
    forgetWriteSchema,
    readTags,
    refKey,
    scopesForgotten,
    targetReaches,
    targetsForgotten,
} from "@/lib/cache-scopes";

describe("readTags", () => {
    it("files a read under the person and under its scope, both by id", () => {
        expect(readTags("u1", "sets")).toEqual(["user:u1", "user:u1:sets"]);
    });

    it("files a set page under its own piece as well as the whole scope", () => {
        expect(readTags("u1", { scope: "setPages", part: "sv1" })).toEqual(["user:u1", "user:u1:setPages", "user:u1:setPages:sv1"]);
    });
});

describe("forgetTags", () => {
    it("forgets everything through the person's own tag, which every read carries", () => {
        expect(forgetTags("u1", "all")).toEqual(["user:u1"]);
    });

    it("never forgets the profile on a card write", () => {
        expect(scopesForgotten("cards")).not.toContain("profile");
        expect(forgetTags("u1", "cards")).toEqual([
            "user:u1:lists",
            "user:u1:stats",
            "user:u1:holdings",
            "user:u1:binders",
            "user:u1:sets",
            "user:u1:setPages",
            "user:u1:value",
        ]);
    });

    it("forgets the lists, the favorites count and the value lines on a star, and not the binders, the sets or the profile", () => {
        expect(forgetTags("u1", "favorite")).toEqual(["user:u1:lists", "user:u1:stats", "user:u1:value"]);
    });

    it("keeps what a star cannot change: the facets, the dearest cards, the Pokémon count and every set page", () => {
        const dropped = forgetTags("u1", "favorite");
        expect(dropped).not.toContain("user:u1:holdings");
        expect(dropped).not.toContain("user:u1:sets");
        expect(dropped).not.toContain("user:u1:setPages");
        expect(scopesForgotten("favorite")).toEqual(["lists", "stats", "value"]);
    });

    it("narrows a card write to the one set it names, and to nothing else", () => {
        const dropped = forgetTags("u1", "cards", "sv1");
        expect(dropped).toContain("user:u1:setPages:sv1");
        expect(dropped).not.toContain("user:u1:setPages");
        // The shelf's tile counts move whatever the set, so the shelf still goes.
        expect(dropped).toContain("user:u1:sets");
        // And the rest is untouched by the narrowing.
        expect(dropped.filter((tag) => !tag.startsWith("user:u1:setPages"))).toEqual(forgetTags("u1", "cards").filter((tag) => tag !== "user:u1:setPages"));
    });

    it("drops every set page when no set is named, an import or a bulk edit", () => {
        expect(forgetTags("u1", "cards", null)).toContain("user:u1:setPages");
        expect(forgetTags("u1", "all", "sv1")).toEqual(["user:u1"]);
    });

    it("narrows only the parted scopes, never a whole one", () => {
        expect(targetsForgotten("cards", "sv1")).toEqual(["lists", "stats", "holdings", "binders", "sets", { scope: "setPages", part: "sv1" }, "value"]);
    });

    it("forgets the binders, their lists and their value lines on a binder write, and not the numbers or the profile", () => {
        expect(forgetTags("u1", "binders")).toEqual(["user:u1:binders", "user:u1:lists", "user:u1:value"]);
    });

    it("forgets the profile alone on a profile write", () => {
        expect(forgetTags("u1", "profile")).toEqual(["user:u1:profile"]);
    });

    it("forgets the lists alone when a Pokédex slot's face changes, where a Pokédex binder's cards are kept", () => {
        expect(forgetTags("u1", "dexFace")).toEqual(["user:u1:lists"]);
    });

    it("keeps one person's tags apart from another's", () => {
        expect(forgetTags("u2", "cards").every((tag) => tag.startsWith("user:u2:"))).toBe(true);
    });

    it("forgets every scope for all, and only known scopes for the rest", () => {
        expect(scopesForgotten("all")).toEqual(CACHE_SCOPES);
        for (const scopes of Object.values(FORGETS)) for (const scope of scopes) expect(CACHE_SCOPES).toContain(scope);
    });
});

describe("targetReaches", () => {
    it("lets a whole scope reach its pieces, and a piece reach only itself", () => {
        expect(targetReaches("setPages", refKey({ scope: "setPages", part: "sv1" }))).toBe(true);
        expect(targetReaches("setPages", "setPages")).toBe(true);
        expect(targetReaches({ scope: "setPages", part: "sv1" }, refKey({ scope: "setPages", part: "sv1" }))).toBe(true);
        expect(targetReaches({ scope: "setPages", part: "sv1" }, refKey({ scope: "setPages", part: "base1" }))).toBe(false);
        // A scope whose name starts another's must not be swept up with it.
        expect(targetReaches("sets", refKey({ scope: "setPages", part: "sv1" }))).toBe(false);
        expect(targetReaches("stats", "holdings")).toBe(false);
    });
});

describe("the scopes themselves", () => {
    it("names every parted scope in the list of scopes", () => {
        for (const scope of PARTED_SCOPES) expect(CACHE_SCOPES).toContain(scope);
    });

    it("keeps the counts a star moves apart from what only a card write moves", () => {
        expect(CACHE_SCOPES).toContain("stats");
        expect(CACHE_SCOPES).toContain("holdings");
        expect(FORGETS.favorite).toContain("stats");
        expect(FORGETS.favorite).not.toContain("holdings");
        expect(FORGETS.cards).toContain("holdings");
    });
});

describe("forgetSetSchema", () => {
    it("takes a catalogue set id and refuses anything that could be another tag", () => {
        for (const id of ["sv1", "base1", "sv3pt5", "swshp", "A1a"]) expect(forgetSetSchema.safeParse(id).success).toBe(true);
        for (const id of ["", "user:u1", "sv1:x", "a/b", "sv 1", "x".repeat(65)]) expect(forgetSetSchema.safeParse(id).success).toBe(false);
    });
});

describe("forgetWriteSchema", () => {
    it("takes the writes it knows and nothing else", () => {
        for (const write of ["all", "cards", "favorite", "binders", "profile", "dexFace"]) expect(forgetWriteSchema.safeParse(write).success).toBe(true);
        for (const write of ["", "Cards", "stats", "user:u2"]) expect(forgetWriteSchema.safeParse(write).success).toBe(false);
    });
});
