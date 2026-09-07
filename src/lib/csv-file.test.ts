import { describe, expect, it } from "vitest";
import { readCsv } from "./csv-file";

const utf8 = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

/** What a Windows app writes: UTF-16 little-endian, byte order mark and all. */
const utf16le = (s: string) => {
    const out = new Uint8Array(2 + s.length * 2);
    out[0] = 0xff;
    out[1] = 0xfe;
    for (let i = 0; i < s.length; i++) {
        out[2 + i * 2] = s.charCodeAt(i) & 0xff;
        out[3 + i * 2] = s.charCodeAt(i) >> 8;
    }
    return out.buffer;
};

const HEADER = "Type;Category;Set;Name\ncollection;My Collection;151;Nidoking";

describe("readCsv", () => {
    it("reads a plain UTF-8 file", () => {
        expect(readCsv(utf8(HEADER))).toEqual({ ok: true, text: HEADER });
    });

    it("reads the UTF-16 a Dex export is written in", () => {
        // The whole point: read as UTF-8 this is "T\0y\0p\0e\0" and matches no
        // header, so the import silently finds nothing.
        expect(readCsv(utf16le(HEADER))).toEqual({ ok: true, text: HEADER });
    });

    it("keeps the accents that made somebody choose UTF-16", () => {
        const text = "Set;Name\nEX Delta Species;Vaporeon δ";

        expect(readCsv(utf16le(text))).toEqual({ ok: true, text });
        expect(readCsv(utf8(text))).toEqual({ ok: true, text });
    });

    it("refuses a file that is not text", () => {
        const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfd]);

        expect(readCsv(png.buffer)).toMatchObject({ ok: false });
    });

    it("refuses an empty file, and one with only whitespace", () => {
        expect(readCsv(new ArrayBuffer(0))).toMatchObject({ ok: false });
        expect(readCsv(utf8("  \n\n "))).toMatchObject({ ok: false });
    });

    it("refuses a file past the API's limit", () => {
        expect(readCsv(utf8("a".repeat(2 * 1024 * 1024 + 1)))).toMatchObject({ ok: false });
    });
});
