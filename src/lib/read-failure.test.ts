import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE_NOT_ANSWERING } from "@/lib/read-failure";

/*
 * One fault, one sentence. Three screens said "The card service didn't answer" while the set
 * pages, the binders and the sheet called the same thing the card catalogue. This walks the whole
 * of `src` rather than a list of files, so the fourth screen that has to say it cannot quietly
 * invent a fifth wording.
 */
// The repo root, as vitest's own root: a relative path would depend on where the run started.
const HERE = join(import.meta.dirname ?? __dirname, "..", "..");

const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sources(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });

describe("the sentence for a catalogue that did not answer", () => {
    it("is written once, and nowhere else", () => {
        const spelled: string[] = [];
        const service: string[] = [];
        for (const file of sources(join(HERE, "src"))) {
            const source = readFileSync(file, "utf8");
            const where = file.slice(HERE.length + 1);
            // The old words for this fault. The one mention left is this file's own account of them.
            if (/card service/.test(source) && !where.startsWith("src/lib/read-failure")) service.push(where);
            if (source.includes(CATALOGUE_NOT_ANSWERING) && !where.startsWith("src/lib/read-failure")) spelled.push(where);
        }
        expect(service, "these still say card service").toEqual([]);
        expect(spelled, "these spell the sentence out instead of reading the constant").toEqual([]);
    });
});
