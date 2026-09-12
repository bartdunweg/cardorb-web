import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import { formatCount } from "@/lib/format";
import type { BrowseLanguage } from "@/lib/languages";
import type { SetSummary } from "@/lib/sets";
import { cx } from "@/utils/cx";

/**
 * Ours: one set on the Browse shelf, its logo as the tile and its name and count under it.
 *
 * A catalogue is led by its pictures: Spotify, TIDAL and Record Club all draw an album as its
 * cover with the title and a line of detail beneath, and a set has a logo the way an album has a
 * cover. The shelf used to be text rows with the logo squeezed into a 48 px box beside the name,
 * where the logo was decoration; here it is the thing you scan for, and the words confirm it.
 *
 * The whole tile is the link. The count is one quiet line under the name, no bar: the owner's
 * call, the shelf shows the sets, and how far each one is stays a number, not a meter on every
 * tile. A set with nothing in it stays on the shelf but dimmed, like an empty Pokédex slot: it
 * is the part still to collect.
 *
 * A set without a logo shows the first word of its name, large and quiet, so the box is never
 * blank. Not its symbol: of the 37 sets on the English shelf without a logo (2026-09-11), 35 have
 * no symbol either and the other two name a file TCGdex answers 404 for, so a symbol branch drew
 * an empty box on exactly the tiles it was there for.
 */

/**
 * The widest the logo is drawn, in CSS pixels, handed to the optimizer as the 1x candidate.
 *
 * The tile is widest at the top of the three-column range: 1023 px across with no sidebar, the
 * page's 48 px of padding and two 16 px gaps taken out, is 314 px a tile; the logo sits inside
 * the box's 16 px padding, so 282 px, rounded to the next step. Six columns under the 1280 px
 * container come to 192 px, four columns beside the sidebar to 223 px, a phone's two to 295 px
 * at most: every other width draws it smaller than this. Doubling it here would have the
 * optimizer ask for 4x (the 48 px box once fetched a 192 px file that way), so the number is
 * the drawn width, nothing more. TCGdex logos are around 230 KB as PNG originals; the
 * optimizer's resize is what makes 200 of them affordable.
 */
const LOGO_WIDTH = 288;

/**
 * The shelf's columns: two on a phone, three from sm, four from lg, six from xl. A tile is a
 * picture with two lines under it, so it takes half the width the old row did; the skeleton
 * draws the same columns so nothing moves when the sets land.
 */
export const SETS_COLUMNS = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

/** Tiles that are on screen at load on any width: the widest grid shows six per row. */
export const FIRST_ROW = 6;

export function SetTile({
    set,
    language,
    priority = false,
}: {
    set: SetSummary;
    language: BrowseLanguage;
    /** On screen at load: the first row of the first series, which must not wait for lazy loading. */
    priority?: boolean;
}) {
    const empty = set.owned === 0;
    return (
        <Link
            href={`/dashboard/sets/${encodeURIComponent(set.id)}${language === "en" ? "" : `?language=${language}`}`}
            className={cx(
                "flex h-full pressable flex-col gap-3 rounded-xl bg-primary p-3 shadow-lift-xs ring-1 ring-primary outline-focus-ring transition-[color,background-color,box-shadow] ring-inset hover:bg-secondary focus-visible:outline-2",
                empty && "opacity-70 hover:opacity-100",
            )}
        >
            {/* The picture box: 4:3, since a set logo is a wide mark, and the same on every tile so
                the rows line up whatever each logo's own shape is. The logo is decoration (the
                name under it says which set this is), so it carries no alt text. */}
            <div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-lg bg-secondary p-4">
                {set.logoUrl ? (
                    <CardImage src={set.logoUrl} alt="" width={LOGO_WIDTH} ratio="square" priority={priority} className="object-contain" />
                ) : (
                    // No logo: the name's first word, large and quiet, so the box says something
                    // rather than sitting grey. aria-hidden: the name is under it.
                    <span aria-hidden="true" className="truncate text-display-xs font-semibold text-tertiary">
                        {firstWord(set.name)}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
                <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-primary">{set.name}</span>
                    {set.localName ? <span className="truncate text-xs text-tertiary">{set.localName}</span> : null}
                </span>
                {/* A set the catalogue has not recorded cards for is not "0 of 60 to go": the count
                    would say the collecting is unstarted where it is the catalogue that is. The tile
                    says so instead, in the words the set's own page uses, and still opens it. */}
                {set.cardsRecorded ? (
                    <span className="text-sm text-tertiary tabular-nums">
                        {formatCount(set.owned)} of {formatCount(set.total)}
                    </span>
                ) : (
                    <span className="text-xs text-tertiary">No cards in the catalogue yet</span>
                )}
            </div>
        </Link>
    );
}

/** "Scarlet & Violet" → "Scarlet"; a name that is one word is its own first word. */
const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? name;
