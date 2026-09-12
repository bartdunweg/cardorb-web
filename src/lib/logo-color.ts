import { unstable_cache } from "next/cache";
import { PNG } from "pngjs";
import { elapsed, logTiming } from "@/lib/timing";

/**
 * The few colours a set's logo is made of, for the wash behind it on the set's page and its tile.
 *
 * Read from the logo file itself, on the server, once per logo: the file is fetched, decoded and
 * walked, and the answer (a hex string, or null) is kept thirty days under the logo's address. A
 * logo never changes, so the first person to open a set pays the read and everyone after gets a
 * cache hit. The set page renders after this, so it must never hang the page: the fetch has a
 * five-second limit and every failure (a catalogue not answering, a file that is not a PNG) reads
 * as "no colour", which draws the band in the page's own grey.
 *
 * Only PNG is read: TCGdex serves every logo as one (beside the WebP the page draws, see
 * `pngAddress`), pokemontcg.io's are PNG too, and a pure-JS PNG decoder costs nothing to ship.
 * A logo in another format is simply a set without a colour, not a failure.
 */

const THIRTY_DAYS = 30 * 24 * 3600;
const FETCH_LIMIT_MS = 5_000;
/** Bump when the picking changes: the Data Cache outlives a deploy (see the memory of #206). */
const VERSION = "v4";

export async function logoPalette(url: string | null): Promise<string[]> {
    if (!url) return [];
    const start = performance.now();
    let ran = false;
    try {
        return await unstable_cache(
            async () => {
                ran = true;
                return readLogoPalette(url);
            },
            ["logo-color", VERSION, url],
            { revalidate: THIRTY_DAYS },
        )();
    } finally {
        logTiming("cache logo-color", elapsed(start), ran ? "miss" : "hit");
    }
}

/** Many logos' palettes in the same order, read `CONCURRENCY` at a time so a shelf of 200 does not open 200 connections at once. */
export async function logoPalettes(urls: (string | null)[]): Promise<string[][]> {
    const out: string[][] = urls.map(() => []);
    let next = 0;
    const worker = async () => {
        while (next < urls.length) {
            const i = next++;
            out[i] = await logoPalette(urls[i] ?? null);
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
    return out;
}

/** Reads in flight at once for a shelf. At the five-second limit each, a catalogue that answers nothing costs a 200-set shelf under a minute, once. */
const CONCURRENCY = 24;

async function readLogoPalette(url: string): Promise<string[]> {
    try {
        const res = await fetch(pngAddress(url), { signal: AbortSignal.timeout(FETCH_LIMIT_MS), cache: "no-store" });
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("image/png")) return [];
        const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
        return pickPalette(png.data, png.width, png.height);
    } catch {
        return [];
    }
}

/**
 * The set page's logo is TCGdex's `logo.webp` (cardorb-api's catalogue.ts asks for it that way, the
 * shelf for `.png`). TCGdex serves every asset in both, from the same address bar the extension,
 * so the PNG sibling is what gets read; any other address is asked for as it is.
 */
function pngAddress(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname === "assets.tcgdex.net" && u.pathname.endsWith(".webp")) {
            u.pathname = u.pathname.replace(/\.webp$/, ".png");
            return u.toString();
        }
    } catch {
        // Not an address: the fetch below fails and answers null.
    }
    return url;
}

/** How many pixels are looked at, at most; a 2500 × 1281 original is read at every third pixel. */
const SAMPLE_BUDGET = 400_000;
/** Below this the pixel is background or anti-aliasing, not the mark. */
const OPAQUE = 200;
/** What counts as vivid: saturated, and neither near-black nor near-white. */
const MIN_SATURATION = 0.45;
const MIN_LIGHTNESS = 0.2;
const MAX_LIGHTNESS = 0.8;
/** A logo whose vivid part is smaller than this share of its mark is a grey logo: no colour. */
const MIN_VIVID_SHARE = 0.05;
const HUE_BINS = 24;

/** A hue the logo has less of than this share of its largest one is a stroke, not a colour of the logo. */
const MIN_HUE_SHARE = 0.2;
/** Two winning hues closer than this are one colour drawn twice (a gradient in the mark); the smaller is skipped. */
const MIN_HUE_APART = 40;
const PALETTE = 3;

/**
 * The logo's own colours, largest first, at most three, each as `#rrggbb`; empty for a logo
 * that is grey, black or white.
 *
 * Every opaque, saturated, mid-light pixel votes for its hue, weighted by its saturation. The
 * hues with the most votes win, far enough apart to be different colours, and each is the
 * average of its own pixels, so it is the logo's colour and not a brighter idea of it. A wash
 * drawn from these is the logo's palette: Base Set's yellow with its blue, Paradox Rift's blue
 * with its purple and orange.
 */
export function pickPalette(data: Uint8Array | Buffer, width: number, height: number): string[] {
    const pixels = width * height;
    const stride = Math.max(1, Math.ceil(pixels / SAMPLE_BUDGET));
    const bins = Array.from({ length: HUE_BINS }, (_, i) => ({ hue: (i + 0.5) * (360 / HUE_BINS), weight: 0, r: 0, g: 0, b: 0 }));
    let opaque = 0;
    let vivid = 0;
    for (let p = 0; p < pixels; p += stride) {
        const i = p * 4;
        if ((data[i + 3] ?? 0) < OPAQUE) continue;
        opaque += 1;
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const [h, s, l] = hsl(r, g, b);
        if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;
        vivid += 1;
        const bin = bins[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS]!;
        bin.weight += s;
        bin.r += r * s;
        bin.g += g * s;
        bin.b += b * s;
    }
    if (opaque === 0 || vivid / opaque < MIN_VIVID_SHARE) return [];
    const ranked = [...bins].filter((bin) => bin.weight > 0).sort((a, b) => b.weight - a.weight);
    const top = ranked[0]!.weight;
    const chosen: (typeof bins)[number][] = [];
    for (const bin of ranked) {
        if (chosen.length === PALETTE || bin.weight < top * MIN_HUE_SHARE) break;
        if (chosen.some((c) => hueDistance(c.hue, bin.hue) < MIN_HUE_APART)) continue;
        chosen.push(bin);
    }
    return chosen.map((bin) => rgbHex(bin.r / bin.weight, bin.g / bin.weight, bin.b / bin.weight));
}

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

const rgbHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Hue in degrees, saturation and lightness in 0–1. */
function hsl(r255: number, g255: number, b255: number): [number, number, number] {
    const r = r255 / 255;
    const g = g255 / 255;
    const b = b255 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
}
