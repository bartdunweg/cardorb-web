import { CardImage } from "@/components/app/card-image";
import { HoverPrefetchLink } from "@/components/app/hover-prefetch-link";
import { formatCount, formatDate } from "@/lib/format";
import type { BrowseLanguage } from "@/lib/languages";
import type { SetSummary } from "@/lib/sets";
import { cx } from "@/utils/cx";

/** The logo box's width in the row, in CSS pixels; the 1x candidate the optimizer gets. */
const LOGO_WIDTH = 96;

/**
 * Ours: one set on the Browse shelf as a row, the list layout beside the tiles (set-tile.tsx).
 * The logo small at the left, the name and its release date (not the set's own Japanese name), and the count at the right; the
 * whole row is the link. Dimmed with nothing in it, like the tile.
 */
export function SetRow({ set, language }: { set: SetSummary; language: BrowseLanguage }) {
    const empty = set.owned === 0;
    return (
        <HoverPrefetchLink
            href={`/dashboard/sets/${encodeURIComponent(set.id)}${language === "en" ? "" : `?language=${language}`}`}
            // One level in: the set's page comes from the right (page-transition.tsx).
            transitionTypes={["nav-forward"]}
            className={cx(
                "flex pressable items-center gap-3 rounded-xl bg-page p-2 pr-3 shadow-lift-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-alpha-black/4 focus-visible:outline-2",
                empty && "opacity-70 hover:opacity-100",
            )}
        >
            {/* The logo is decoration, the name beside it says which set: no alt text. */}
            <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary p-1.5">
                {set.logoUrl ? (
                    <CardImage src={set.logoUrl} alt="" width={LOGO_WIDTH} ratio="square" className="object-contain" />
                ) : (
                    <span aria-hidden="true" className="max-w-full min-w-0 truncate text-xs font-semibold text-tertiary">
                        {firstWord(set.name)}
                    </span>
                )}
            </div>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-primary">{set.name}</span>
                {set.releaseDate ? <span className="truncate text-xs text-tertiary">{formatDate(set.releaseDate)}</span> : null}
            </span>
            {set.cardsRecorded ? (
                <span className="shrink-0 text-sm text-tertiary tabular-nums">
                    {formatCount(set.owned)} of {formatCount(set.total)}
                </span>
            ) : (
                <span className="shrink-0 text-xs text-tertiary">No cards yet</span>
            )}
        </HoverPrefetchLink>
    );
}

const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? name;
