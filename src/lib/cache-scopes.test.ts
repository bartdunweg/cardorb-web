import { describe, expect, it } from "vitest";
import { CACHE_SCOPES, FORGETS, forgetTags, forgetWriteSchema, readTags, scopesForgotten } from "@/lib/cache-scopes";

describe("readTags", () => {
    it("files a read under the person and under its scope, both by id", () => {
        expect(readTags("u1", "sets")).toEqual(["user:u1", "user:u1:sets"]);
    });
});

describe("forgetTags", () => {
    it("forgets everything through the person's own tag, which every read carries", () => {
        expect(forgetTags("u1", "all")).toEqual(["user:u1"]);
    });

    it("never forgets the profile on a card write", () => {
        expect(scopesForgotten("cards")).not.toContain("profile");
        expect(forgetTags("u1", "cards")).toEqual(["user:u1:lists", "user:u1:stats", "user:u1:binders", "user:u1:sets", "user:u1:value"]);
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

describe("forgetWriteSchema", () => {
    it("takes the writes it knows and nothing else", () => {
        for (const write of ["all", "cards", "binders", "profile", "dexFace"]) expect(forgetWriteSchema.safeParse(write).success).toBe(true);
        for (const write of ["", "Cards", "stats", "user:u2"]) expect(forgetWriteSchema.safeParse(write).success).toBe(false);
    });
});
