import { describe, expect, it } from "vitest";
import { heard, wrote } from "./search-echo";

describe("a search field and the URL it writes", () => {
    it("keeps the box when the page comes back with the term it wrote", () => {
        expect(heard(["char"], "char")).toEqual({ sent: [], take: false });
    });

    it("keeps waiting for a newer term after an older one comes back", () => {
        expect(heard(["char", "charizard"], "char")).toEqual({ sent: ["charizard"], take: false });
    });

    it("forgets older terms when a newer one comes back first", () => {
        expect(heard(["pika", "pikac"], "pikac")).toEqual({ sent: [], take: false });
    });

    it("takes the last of a term written twice", () => {
        expect(heard(["pika", "pikaa", "pika"], "pika")).toEqual({ sent: [], take: false });
    });

    it("takes a URL it did not write, such as Back or a filter cleared", () => {
        expect(heard(["char"], "mew")).toEqual({ sent: [], take: true });
        expect(heard([], "")).toEqual({ sent: [], take: true });
    });

    it("compares the URL's term trimmed, as it was written", () => {
        expect(heard(["mew"], "mew ")).toEqual({ sent: [], take: false });
    });

    it("waits once for a term written twice in a row", () => {
        expect(wrote(["mew"], "mew")).toEqual(["mew"]);
        expect(wrote(["mew"], "mewt")).toEqual(["mew", "mewt"]);
    });
});
