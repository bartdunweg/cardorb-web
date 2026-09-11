import { CardImage } from "@/components/app/card-image";
import { StatCard } from "@/components/app/cards-stats";
import { formatCount, formatPrice, formatValue } from "@/lib/format";
import { linePath, pointsFor } from "@/lib/value-chart-math";

/**
 * Ours: the landing's picture of the product — Home in miniature, drawn from the app's own parts.
 *
 * A landing for a tracking product shows the product (Origin, Oku and Monarch all put the
 * dashboard in the hero), and a screenshot of it goes stale the week after it is taken. This is
 * not a screenshot: it is the value block, the four stat tiles and the row of dearest cards,
 * laid out as Home lays them out, on sample numbers — so it redraws itself with every change
 * to the tiles, the tokens or the type, and the picture the visitor sees is the app they get.
 *
 * What it borrows and what it does not. The tiles are Home's `StatCard`; the pictures go through
 * `CardImage`, so the optimizer resizes and caches them like every other card. The value line is
 * the chart's own arithmetic (`pointsFor`, `linePath`) on a fixed series, drawn as one path: not
 * `ValueChart`, which carries a hover layer and keyboard handling this picture has no use for. The
 * card tiles copy the classes of Home's `CardTile` rather than importing it: that file imports
 * react-aria at the top, whether or not a tile is pressable, and the landing deliberately ships
 * none of it (see `LinkButton`).
 *
 * Decoration for a sighted visitor: one accessible name on the frame, nothing inside it reachable
 * or pressable. The h1 and the button beside it remain the page's content.
 */

// Thirty nights of a collection's value, oldest first, ending at what the big number says.
const VALUES = [
    38547, 38610, 38702, 38690, 38955, 39120, 39088, 39410, 39575, 39620, 39980, 40105, 40090, 40460, 40830, 40795, 41210, 41330, 41605, 41980, 42040, 42410,
    42680, 42655, 43120, 43590, 43870, 44310, 44805, 45240,
];
const VALUE = VALUES[VALUES.length - 1];
const CHANGE = VALUE - VALUES[0];

// The line's frame, in SVG units: the box is stretched to the panel's width and the stroke stays
// 2 px through `vectorEffect`, so the curve never thickens with the layout.
const FRAME = { width: 600, height: 120, top: 6, right: 0, bottom: 2, left: 0 };
const POINTS = pointsFor(VALUES, FRAME, Math.min(...VALUES), Math.max(...VALUES));
const LINE = linePath(POINTS);
const AREA = `${LINE} L${FRAME.width} ${FRAME.height} L0 ${FRAME.height} Z`;

// Six real printings, dearest first, as Home's row sorts them. Prices are Cardmarket's at the
// time of writing, rounded the way the tiles show them.
const CARDS = [
    { id: "sv04.5-232", name: "Mew ex", price: 742.37, image: "https://assets.tcgdex.net/en/sv/sv04.5/232" },
    { id: "sv03.5-199", name: "Charizard ex", price: 368.3, image: "https://assets.tcgdex.net/en/sv/sv03.5/199" },
    { id: "sv06-220", name: "Perrin", price: 98.23, image: "https://assets.tcgdex.net/en/sv/sv06/220" },
    { id: "swsh12.5gg-GG12", name: "Deoxys", price: 21.46, image: "https://assets.tcgdex.net/en/swsh/swsh12.5/GG12" },
    { id: "sv03.5-151", name: "Mew ex", price: 7.56, image: "https://assets.tcgdex.net/en/sv/sv03.5/151" },
    { id: "sv03-125", name: "Charizard ex", price: 3.88, image: "https://assets.tcgdex.net/en/sv/sv03/125" },
];

export function LandingPreview({ className }: { className?: string }) {
    return (
        // A composite picture, which is what ARIA's img role is for: one name for the whole, and a
        // reader never walks the numbers inside. No single <img> could hold it, so the lint's
        // preference for the tag does not apply here.
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a group of elements read as one picture
        <div
            role="img"
            aria-label="Preview of the Cardorb dashboard"
            // No background of its own: the dashboard sits on the landing's ground, as Linear's does,
            // held by one hairline. A second surface behind the tiles read as tooling laid over the
            // page, plainest in the dark. The owner's call.
            className={`pointer-events-none flex flex-col gap-5 overflow-hidden rounded-2xl p-4 ring-1 ring-primary select-none ring-inset sm:gap-6 sm:p-6 ${className ?? ""}`}
        >
            {/* Home's value block: the label, the number, the change over the period, the line. */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-tertiary">Collection value</p>
                    <p className="text-display-md font-semibold text-primary tabular-nums sm:text-display-lg">{formatValue(VALUE)}</p>
                    <p className="text-sm font-medium text-success-primary tabular-nums">+{formatValue(CHANGE)} in the last 30 days</p>
                </div>
                <svg
                    viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
                    preserveAspectRatio="none"
                    className="h-20 w-full text-fg-primary sm:h-28"
                    aria-hidden="true"
                    focusable="false"
                >
                    <defs>
                        <linearGradient id="landing-preview-fade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="currentColor" stopOpacity="0.12" />
                            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={AREA} fill="url(#landing-preview-fade)" />
                    <path
                        d={LINE}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>

            {/* The four counts, on Home's tiles, breaking to a row where Home does. */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Owned" value={formatCount(1931)} />
                <StatCard label="Wishlist" value={formatCount(24)} />
                <StatCard label="Favorites" value={formatCount(12)} />
                <StatCard label="Pokémon collected" value={formatCount(545)} detail={`of ${formatCount(1025)}`} />
            </div>

            {/* The dearest cards, as Home's row draws them; the frame crops the row's end, the way the
                row on Home runs off the screen and scrolls. */}
            <div className="flex flex-col gap-3" aria-hidden="true">
                <p className="text-md font-semibold text-primary">Most valuable cards</p>
                <ul className="flex gap-3 overflow-hidden">
                    {CARDS.map((card) => (
                        <li key={card.id} className="flex w-24 shrink-0 flex-col gap-1.5 rounded-card sm:w-28">
                            <div className="relative aspect-card w-full overflow-hidden rounded-card bg-quaternary">
                                <CardImage src={`${card.image}/high.webp`} fallbackSrc={`${card.image}/low.webp`} alt="" width={160} className="object-cover" />
                            </div>
                            <span className="w-full truncate text-xs font-medium text-primary">{card.name}</span>
                            <span className="text-xs text-tertiary tabular-nums">{formatPrice(card.price)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
