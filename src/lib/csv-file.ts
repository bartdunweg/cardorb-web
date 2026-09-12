/**
 * A file somebody dropped on the page, as text.
 *
 * This is one function because it is one decision, and it is the decision that
 * decides whether an import works at all. A CSV is bytes; every parser after
 * this point takes a string; and the step between the two is the one nobody
 * thinks about until a file comes back reading as nothing.
 *
 * Dex exports UTF-16, which is not exotic (it is what a Windows app writes
 * when it wants to be safe about accents), and read as UTF-8 it does not look
 * odd, it looks like `T\0y\0p\0e\0`, matching no header and importing zero
 * rows. Excel writes a UTF-8 byte order mark. Telling somebody to re-save
 * their file as "CSV UTF-8" is asking them to solve our problem, and they
 * would have to know that is what went wrong.
 */

/** The two megabytes the API accepts, checked here so it is said in words. */
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * Which encoding the bytes are in, by their byte order mark.
 *
 * The mark is the only reliable signal a file gives, and every encoding that
 * needs one writes one; a UTF-16 file without a BOM is not something an export
 * produces. No mark means UTF-8, which is the right guess for everything else
 * and is what a plain ASCII file is anyway.
 */
function encodingOf(bytes: Uint8Array): string {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";
    return "utf-8";
}

export type CsvRead = { ok: true; text: string } | { ok: false; error: string };

/**
 * The file's text, or a sentence saying why not.
 *
 * The size is checked on the decoded text rather than on the file: the API's
 * limit is on the JSON string it receives, and a UTF-16 file halves on the way
 * (1.3 MB of Dex arrives as 635 KB), so measuring the bytes would refuse files
 * that fit. `fatal` decoding, because a file that is not text at all should say
 * so here rather than reach the parser as a screenful of replacement characters
 * and be reported as "no card name" four thousand times.
 */
export function readCsv(buffer: ArrayBuffer): CsvRead {
    const bytes = new Uint8Array(buffer);
    if (bytes.length === 0) return { ok: false, error: "That file is empty." };

    let text: string;
    try {
        text = new TextDecoder(encodingOf(bytes), { fatal: true }).decode(bytes);
    } catch {
        return { ok: false, error: "That file could not be read as text. Is it a CSV?" };
    }

    if (!text.trim()) return { ok: false, error: "That file is empty." };
    if (text.length > MAX_CSV_BYTES) {
        return { ok: false, error: "That file is too large. The limit is 2 MB." };
    }
    return { ok: true, text };
}
