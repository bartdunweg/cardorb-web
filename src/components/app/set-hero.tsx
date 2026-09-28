import { SetLogo } from "@/components/app/set-logo";
import { cx } from "@/utils/cx";

/**
 * Ours: the top of a set's page, its logo centred on a wash of the logo's own colours.
 *
 * A catalogue page leads with its artwork the way an album page does: Spotify, YouTube Music and
 * TIDAL all draw the cover large with a wash of its colour behind it, and a set's logo is its
 * cover. The wash is the logo's own two or three colours (`logo-color.ts`), each a soft pool of
 * light from a different point along the top, fading to nothing well below the logo: a tint of the
 * page, never a block of colour. It runs the whole width of the window, behind the floating
 * sidebar and under the phone's bar, because it is the page's ground lit up and the ground does
 * not stop at a column. The logo stays in the column, centred. A logo whose colours cannot be
 * read (grey, or a catalogue not answering) gets the same wash in the page's quiet grey; a set
 * without a logo gets its name's first word, as the shelf's tile does.
 *
 * From `lg` the page head is compact, as a collection page's is (OpenSea, Binance NFT on Mobbin): the
 * logo small before the set's name (`SetLogoBeside`, PageHeader's `media`), the numbers at the row's
 * right end. Centred alone at the top it floated far from the name it belongs to (Bart, 2026-09-28).
 * The band keeps the wash and, there, the Back button.
 *
 * The logo carries a drop shadow because it is drawn on colours picked from itself. Decoration
 * throughout: the h1 under it says which set, so the picture has no alt text and the wash no role.
 */

/** The widest the logo is drawn, in CSS pixels: the box is 224 wide from `sm`, 192 under it. */
const LOGO_WIDTH = 224;

/** How much of a colour reaches the page: the wash is a tint, the logo is the thing. */
const STRENGTH = "42%";

/**
 * The wash as CSS: one pool per colour along the top edge, the first at the left, the second at
 * the right, a third in the middle. `mask` fades all of it out towards the bottom.
 */
export function colorWash(colors: string[]): { background: string; maskImage: string; WebkitMaskImage: string } {
    const [a, b, c] = colors.length ? colors : ["var(--color-bg-tertiary)"];
    const pool = (color: string, at: string, size: string) =>
        `radial-gradient(${size} at ${at}, color-mix(in oklab, ${color} ${STRENGTH}, transparent), transparent 70%)`;
    const pools = [pool(a, "12% 0%", "70% 100%"), b ? pool(b, "88% 0%", "70% 100%") : null, c ? pool(c, "50% 10%", "50% 80%") : null].filter(Boolean);
    const fade = "linear-gradient(to bottom, black 25%, transparent 100%)";
    return { background: pools.join(", "), maskImage: fade, WebkitMaskImage: fade };
}

/**
 * The wash alone, positioned by whoever draws it: the set page puts it across the window's top,
 * the design page inside a box. Its parent must be `relative isolate` (or the app frame is).
 */
export function SetWash({ colors, className }: { colors: string[]; className?: string }) {
    return <div aria-hidden="true" className={cx("pointer-events-none absolute -z-10", className)} style={colorWash(colors)} />;
}

export function SetHero({ name, logoUrl, colors }: { name: string; logoUrl: string | null; colors: string[] }) {
    return (
        <>
            {/* Across the whole window: positioned by the app frame (the `relative isolate` root in the
                app layout), not by the page's column, so it runs behind the sidebar too. */}
            {/* Twice the band's height, so the colour keeps fading well past the logo rather than
                stopping with it. It reaches the title and the line under it at a fraction of its own
                strength; measured there, both stay far above the AA contrast they need. */}
            <SetWash colors={colors} className="inset-x-0 top-0 h-56 sm:h-64" />
            <div aria-hidden="true" className="flex h-28 w-full items-center justify-center sm:h-32 lg:h-16">
                <div className="contents lg:hidden">
                    {logoUrl ? (
                        <div className="relative h-16 w-48 drop-shadow-lg sm:h-20 sm:w-56">
                            <SetLogo src={logoUrl} width={LOGO_WIDTH} priority boxRatio={3} area={0.55} />
                        </div>
                    ) : (
                        <span className="max-w-full min-w-0 truncate px-6 text-display-xs font-semibold text-tertiary">{firstWord(name)}</span>
                    )}
                </div>
            </div>
        </>
    );
}

/**
 * The logo before the set's name from `lg` (PageHeader's `media`), small as a collection's mark is
 * beside its name (OpenSea, on Mobbin); nothing for a set without one, whose name says it.
 */
export function SetLogoBeside({ logoUrl }: { logoUrl: string | null }) {
    if (!logoUrl) return null;
    return (
        <div aria-hidden="true" className="relative h-12 w-32 drop-shadow-md">
            {/* The band's width, so both ask for one file and the browser fetches it once. */}
            <SetLogo src={logoUrl} width={LOGO_WIDTH} priority boxRatio={2.8} area={0.8} align="start" />
        </div>
    );
}

/** "Scarlet & Violet" → "Scarlet"; a name that is one word is its own first word. */
const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? name;
