import { unstable_cache } from "next/cache";
import { PNG } from "pngjs";
import { elapsed, logTiming } from "@/lib/timing";

/**
 * The one bright colour a set's logo is made of, for the band behind it on the set's page.
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
const VERSION = "v3";

export async function logoColor(url: string | null): Promise<string | null> {
    if (!url) return null;
    const start = performance.now();
    let ran = false;
    try {
        return await unstable_cache(
            async () => {
                ran = true;
                return readLogoColor(url);
            },
            ["logo-color", VERSION, url],
            { revalidate: THIRTY_DAYS },
        )();
    } finally {
        logTiming("cache logo-color", elapsed(start), ran ? "miss" : "hit");
    }
}

/** Many logos' colours in the same order, read `CONCURRENCY` at a time so a shelf of 200 does not open 200 connections at once. */
export async function logoColors(urls: (string | null)[]): Promise<(string | null)[]> {
    const out: (string | null)[] = new Array(urls.length).fill(null);
    let next = 0;
    const worker = async () => {
        while (next < urls.length) {
            const i = next++;
            out[i] = await logoColor(urls[i] ?? null);
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
    return out;
}

/** Reads in flight at once for a shelf. At the five-second limit each, a catalogue that answers nothing costs a 200-set shelf under a minute, once. */
const CONCURRENCY = 24;

async function readLogoColor(url: string): Promise<string | null> {
    try {
        const res = await fetch(pngAddress(url), { signal: AbortSignal.timeout(FETCH_LIMIT_MS), cache: "no-store" });
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("image/png")) return null;
        const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
        return pickVividColor(png.data, png.width, png.height);
    } catch {
        return null;
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

/**
 * The largest vivid hue in an RGBA buffer, made bright, as `#rrggbb`; null for a logo that is
 * grey, black or white.
 *
 * Every opaque, saturated, mid-light pixel votes for its hue, weighted by its saturation; the
 * hue with the most votes wins and its pixels are averaged. Averaging inside one hue rather
 * than over the whole logo is what keeps a blue-and-orange logo blue instead of brown.
 */
export function pickVividColor(data: Uint8Array | Buffer, width: number, height: number): string | null {
    const pixels = width * height;
    const stride = Math.max(1, Math.ceil(pixels / SAMPLE_BUDGET));
    const bins = Array.from({ length: HUE_BINS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
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
    if (opaque === 0 || vivid / opaque < MIN_VIVID_SHARE) return null;
    const best = bins.reduce((a, b) => (b.weight > a.weight ? b : a));
    const [h, s] = hsl(best.r / best.weight, best.g / best.weight, best.b / best.weight);
    return hex(h, Math.max(s, MIN_SATURATION_OUT), LIGHTNESS_OUT);
}

/**
 * The band is the same strength on every set. The hue is the logo's; the saturation and the
 * lightness are not, because a logo's own numbers are whatever its artist drew: Paradox Rift's
 * navy came out a dull #1b4182 beside Base Set's #f2bc2b, and the band is meant to be bright.
 */
const MIN_SATURATION_OUT = 0.85;
const LIGHTNESS_OUT = 0.5;

/** `#rrggbb` from a hue in degrees and saturation and lightness in 0–1. */
function hex(h: number, s: number, l: number): string {
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) =>
        Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
            .toString(16)
            .padStart(2, "0");
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

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
