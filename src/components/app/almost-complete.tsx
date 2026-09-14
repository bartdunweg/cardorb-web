import { HoverPrefetchLink } from "@/components/app/hover-prefetch-link";
import { SetWash } from "@/components/app/set-hero";
import { SetLogo } from "@/components/app/set-logo";
import { formatCount, formatPrice } from "@/lib/format";
import { getSet, getSets } from "@/lib/sets";

/** At most this many cards to go for a set to count as almost complete. */
const MOST_MISSING = 5;
/** Sets shown: two rows of three from `lg`. */
const SHOWN = 6;

/**
 * Ours: Home's sets you nearly have, the ones a handful of cards short, with what those cards cost.
 *
 * Read from the English shelf's counts, then each candidate set's own cards, so the number missing
 * and their prices are the set page's own (the shelf counts a gallery into its parent; the set page
 * is where that was settled). Fewest to go first, then cheapest. No card around a row, as the shelf's
 * tiles have none: the logo on its colours, the name, and the cost at the right. The whole row opens
 * the set. Nothing at all when no set is that close or the catalogue does not answer: this is a
 * suggestion, and a failure here is not the page's.
 */
export async function AlmostComplete() {
    let shelf;
    try {
        shelf = await getSets("en");
    } catch {
        return null;
    }
    const near = shelf.series
        .flatMap((group) => group.sets)
        .filter((set) => set.cardsRecorded && set.total - set.owned >= 1 && set.total - set.owned <= MOST_MISSING);
    if (near.length === 0) return null;
    const details = await Promise.all(near.map((set) => getSet(set.id).catch(() => null)));
    const rows = near
        .flatMap((set, i) => {
            const detail = details[i];
            if (!detail) return [];
            const missing = detail.cards.filter((card) => !card.owned);
            if (missing.length < 1 || missing.length > MOST_MISSING) return [];
            const cost = missing.reduce((sum, card) => sum + (card.price ?? 0), 0);
            const unpriced = missing.filter((card) => card.price == null).length;
            return [{ set, missing: missing.length, cost, unpriced }];
        })
        .sort((a, b) => a.missing - b.missing || a.cost - b.cost)
        .slice(0, SHOWN);
    if (rows.length === 0) return null;

    return (
        <section aria-labelledby="almost-complete-heading" className="flex flex-col gap-4">
            <h2 id="almost-complete-heading" className="text-md font-semibold text-primary">
                Almost complete
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(({ set, missing, cost, unpriced }) => (
                    <li key={set.id}>
                        <HoverPrefetchLink
                            href={`/dashboard/sets/${encodeURIComponent(set.id)}`}
                            className="flex pressable items-center gap-3 rounded-lg outline-offset-4 outline-focus-ring focus-visible:outline-2"
                        >
                            {/* Decoration: the name beside it says which set. */}
                            <div className="relative isolate flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary p-1.5">
                                <SetWash colors={set.colors} className="inset-0" />
                                {set.logoUrl ? <SetLogo src={set.logoUrl} width={96} boxRatio={4 / 3} /> : null}
                            </div>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-semibold text-primary">{set.name}</span>
                                <span className="truncate text-xs text-tertiary tabular-nums">
                                    {formatCount(missing)} missing{unpriced > 0 ? ` · ${formatCount(unpriced)} unpriced` : ""}
                                </span>
                            </span>
                            {cost > 0 ? (
                                <span className="flex shrink-0 flex-col items-end">
                                    <span className="text-sm font-medium text-primary tabular-nums">{formatPrice(cost)}</span>
                                    <span className="text-xs text-tertiary">to complete</span>
                                </span>
                            ) : null}
                        </HoverPrefetchLink>
                    </li>
                ))}
            </ul>
        </section>
    );
}
