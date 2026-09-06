import { cx } from "@/utils/cx";

/**
 * An energy type as a small disc, drawn here rather than fetched: no catalogue serves the
 * symbols, and eleven discs are a few lines each. The disc's colour is the colour printed on
 * the cards for that type, a fact about the game and not a theme token, so it stays a literal
 * in the SVG (the way a logo's colour would); the glyph is white on it in every theme.
 */
const TYPES: Record<string, { color: string; glyph: string }> = {
    Grass: { color: "#4a9c3f", glyph: "M12 4c-4 2-6 6-5 10 3 1 7-1 8-4-1 3-3 5-6 6 1 1 3 1 5 0 3-2 3-8-2-12z" },
    Fire: { color: "#e2542f", glyph: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" },
    Water: { color: "#3c8fd8", glyph: "M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" },
    Lightning: { color: "#f2c118", glyph: "M13 3 6 13h5l-1 8 8-11h-5l1-7z" },
    Psychic: { color: "#a35bb8", glyph: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" },
    Fighting: { color: "#b8622c", glyph: "M7 12V8a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v2a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-12 0z" },
    Darkness: { color: "#3f4a5a", glyph: "M14 4a8 8 0 1 0 6 12 6.5 6.5 0 0 1-6-12z" },
    Metal: { color: "#8a99a8", glyph: "M12 4l7 4v8l-7 4-7-4V8l7-4zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
    Fairy: { color: "#e07aa8", glyph: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" },
    Dragon: { color: "#7a6b2f", glyph: "M5 14c2-6 7-9 14-8-2 2-3 3-3 5 2 0 3 1 4 2-3 0-5 1-6 3-1-2-3-2-5-1 0 2 1 3 2 4-3 0-5-2-6-5z" },
    Colorless: { color: "#a8a8a8", glyph: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z" },
};

export function TypeIcon({ type, className }: { type: string; className?: string }) {
    const t = TYPES[type];
    if (!t) return null;
    return (
        <svg viewBox="0 0 24 24" className={cx("size-5 shrink-0", className)} aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill={t.color} />
            <path d={t.glyph} fill="#fff" />
        </svg>
    );
}
