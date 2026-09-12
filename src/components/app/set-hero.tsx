import { CardImage } from "@/components/app/card-image";

/**
 * Ours: the band at the top of a set's page, its logo centred on the set's own colour.
 *
 * A catalogue page leads with its artwork the way an album page does — Spotify, YouTube Music and
 * TIDAL all draw the cover large with a wash of its colour behind it — and a set's logo is its
 * cover. The colour is the logo's own brightest hue, read once from the file (`logo-color.ts`),
 * running from full at the top into the page's ground at the bottom, so the band belongs to the
 * page rather than sitting on it. A logo the colour cannot be read from (grey, or a catalogue
 * not answering) gets the page's quiet grey; a set without a logo gets its name's first word,
 * as the shelf's tile does.
 *
 * The logo carries a drop shadow because it is drawn on a colour picked from itself: Base Set's
 * yellow mark on Base Set's yellow would otherwise melt into it. Decoration throughout — the h1
 * under it says which set, so the picture has no alt text and the band no role.
 */

/** The widest the logo is drawn, in CSS pixels: the box is 320 wide from `sm`, 256 under it. */
const LOGO_WIDTH = 320;

export function SetHero({ name, logoUrl, color }: { name: string; logoUrl: string | null; color: string | null }) {
    return (
        <div
            aria-hidden="true"
            className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl bg-secondary sm:h-56"
            style={
                color
                    ? {
                          // From the colour itself into the page's ground, with a soft light at the
                          // centre for depth: in the dark theme the ground is near-black and the band
                          // deepens toward the bottom, in the light one it lightens.
                          background: [
                              "radial-gradient(ellipse 60% 70% at 50% 40%, color-mix(in oklab, white 16%, transparent), transparent)",
                              `linear-gradient(to bottom, color-mix(in oklab, ${color} 94%, var(--color-bg-page)), color-mix(in oklab, ${color} 58%, var(--color-bg-page)))`,
                          ].join(", "),
                      }
                    : undefined
            }
        >
            {logoUrl ? (
                <div className="relative h-28 w-64 drop-shadow-xl sm:h-36 sm:w-80">
                    <CardImage src={logoUrl} alt="" width={LOGO_WIDTH} ratio="square" priority className="object-contain" />
                </div>
            ) : (
                <span className="truncate px-6 text-display-sm font-semibold text-tertiary">{firstWord(name)}</span>
            )}
        </div>
    );
}

/** "Scarlet & Violet" → "Scarlet"; a name that is one word is its own first word. */
const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? name;
