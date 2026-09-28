import type { ReactNode } from "react";
import type { FilterOption } from "@/components/app/filter-chip";
import { type RarityMark, rarityMark, rarityMarkOfName, setIdOf } from "@/lib/rarity-symbol";
import { cx } from "@/utils/cx";

// A rarity's mark as the card prints it in its corner (`@/lib/rarity-symbol` says which one a card
// carries). Drawn here rather than taken from anybody's chart: a dot, a diamond and stars. Always
// beside the rarity's name, never instead of it, so the drawing is hidden from a screen reader and a
// person who does not know the marks still reads the word.

/** A five-pointed star around (x, y), `r` to its points. */
const star = (x: number, y: number, r: number) => {
    const points = Array.from({ length: 10 }, (_, i) => {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        return `${(x + radius * Math.cos(angle)).toFixed(2)},${(y + radius * Math.sin(angle)).toFixed(2)}`;
    });
    return `M${points.join("L")}Z`;
};

/* The inks: black is the text colour, so it turns white on a dark page as a printed mark would read
   there; gold, silver and the rest keep their colour on either. */
const INK = "fill-fg-primary";
const GOLD = "fill-utility-yellow-400 stroke-utility-yellow-700";
const GOLD_LINE = "fill-none stroke-utility-yellow-500";
const SILVER = "fill-fg-quaternary stroke-fg-tertiary";

/** One or more stars side by side, each with its own ink. */
function Stars({ inks, className }: { inks: string[]; className?: string }) {
    const width = 16 + (inks.length - 1) * 9;
    return (
        <svg viewBox={`0 0 ${width} 16`} aria-hidden="true" className={className}>
            {inks.map((ink, i) => (
                <path key={i} d={star(8 + i * 9, 8.5, inks.length > 1 ? 6.5 : 7.5)} strokeWidth={1.2} strokeLinejoin="round" className={ink} />
            ))}
        </svg>
    );
}

function Drawing({ mark, className }: { mark: RarityMark; className?: string }): ReactNode {
    switch (mark.kind) {
        case "common":
            return (
                <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
                    <circle cx="8" cy="8" r="4.5" className={INK} />
                </svg>
            );
        case "uncommon":
            return (
                <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
                    <path d="M8 2.5 13.5 8 8 13.5 2.5 8Z" className={INK} />
                </svg>
            );
        case "rare":
            return <Stars inks={[INK]} className={className} />;
        case "double":
            return <Stars inks={[INK, INK]} className={className} />;
        case "ace-spec":
            return <Stars inks={["fill-utility-pink-500 stroke-utility-pink-700"]} className={className} />;
        case "ultra":
            return <Stars inks={[SILVER, SILVER]} className={className} />;
        case "illustration":
            return <Stars inks={[GOLD]} className={className} />;
        case "special-illustration":
            return <Stars inks={[GOLD, GOLD]} className={className} />;
        case "hyper":
            return <Stars inks={[GOLD, GOLD, GOLD]} className={className} />;
        case "mega-attack":
            return <Stars inks={["fill-utility-pink-400 stroke-utility-pink-700", "fill-utility-green-400 stroke-utility-green-700"]} className={className} />;
        case "shiny":
            return <Stars inks={[GOLD_LINE]} className={className} />;
        case "shiny-ultra":
            return <Stars inks={[GOLD_LINE, GOLD_LINE]} className={className} />;
        case "black-white":
            return <Stars inks={[INK, "fill-none stroke-fg-primary"]} className={className} />;
        case "futuristic":
            return (
                <Stars inks={["fill-utility-blue-300 stroke-utility-blue-700", "fill-utility-purple-400 stroke-utility-purple-700"]} className={className} />
            );
        case "mega-hyper":
            return (
                <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
                    <path
                        d="M8 1C8.6 5.4 10.6 7.4 15 8 10.6 8.6 8.6 10.6 8 15 7.4 10.6 5.4 8.6 1 8 5.4 7.4 7.4 5.4 8 1Z"
                        strokeWidth={1}
                        strokeLinejoin="round"
                        className="fill-utility-yellow-400 stroke-fg-primary"
                    />
                </svg>
            );
        case "rgb":
            return (
                <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
                    <circle cx="8" cy="5.5" r="3.6" className="fill-utility-red-500" />
                    <circle cx="5.6" cy="10" r="3.6" className="fill-utility-green-500 opacity-90" />
                    <circle cx="10.4" cy="10" r="3.6" className="fill-utility-blue-500 opacity-90" />
                </svg>
            );
        case "pikachu":
            return (
                <svg viewBox="0 0 24 16" aria-hidden="true" className={className}>
                    <rect x="1" y="3.5" width="22" height="9" rx="4.5" strokeWidth={1.2} className="fill-utility-yellow-300 stroke-fg-primary" />
                    <path d="M7 8h10" strokeWidth={1.6} strokeLinecap="round" className="stroke-fg-primary" />
                </svg>
            );
        case "promo":
            return (
                <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
                    {/* The band is cut out of the star, so whatever surface it sits on shows through. */}
                    <path d={`${star(8, 8.5, 7.5)}M3 7.4H13V9.6H3Z`} fillRule="evenodd" className={INK} />
                </svg>
            );
        case "code":
            return (
                <span
                    aria-hidden="true"
                    className="inline-flex h-4 items-center rounded-xs px-1 text-3xs leading-none font-semibold tracking-wide text-secondary ring-1 ring-secondary ring-inset"
                >
                    {mark.code}
                </span>
            );
    }
}

/**
 * The mark alone, the height of the text it sits in. Nothing where the rarity has no mark it
 * certainly prints. `size` "md" is for a line of body text; "sm" for the small grey lines under a
 * card's name.
 */
export function RaritySymbol({
    mark,
    size = "sm",
    column = false,
    className,
}: {
    mark: RarityMark | null;
    size?: "sm" | "md";
    /** In a list of rarities: one width for every mark, the widest (three stars), so the names line up. */
    column?: boolean;
    className?: string;
}) {
    if (!mark) return column ? <span aria-hidden="true" className="inline-block w-8 shrink-0" /> : null;
    return (
        <span className={cx("inline-flex h-lh shrink-0 items-center align-top", column && "w-8 justify-center", className)}>
            <Drawing mark={mark} className={cx("w-auto", size === "sm" ? "h-3" : "h-4")} />
        </span>
    );
}

type OnCard = { rarity?: string | null; tcg_id?: string | null; tcgId?: string | null; language?: string | null };

/** The mark one card prints, from its catalogue id and language. */
export const markOfCard = (card: OnCard, setId?: string | null) =>
    rarityMark(card.rarity, { setId: setId ?? setIdOf(card.tcg_id ?? card.tcgId), language: card.language });

/** A rarity's name with its mark before it, for a sheet's details or a picker's row. */
export function RarityName({ rarity, mark, size = "md" }: { rarity: string; mark: RarityMark | null; size?: "sm" | "md" }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <RaritySymbol mark={mark} size={size} />
            {rarity}
        </span>
    );
}

/** A filter row's or a Pokédex box's rarity: the name's mark, as `rarityMarkOfName` settles it for a row of every era. */
export function RarityNameOnly({ rarity, text = rarity }: { rarity: string; text?: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <RaritySymbol mark={rarityMarkOfName(rarity)} size="md" column />
            {text}
        </span>
    );
}

/**
 * A rarity as a filter's choice: its mark before the name, and nothing where it has none. In the
 * list the marks sit in one column so the names line up; a chip or tag takes the mark at its own width.
 */
export const rarityOption = (rarity: string, mark: RarityMark | null): FilterOption => ({
    value: rarity,
    label: rarity,
    ...(mark ? { icon: <RaritySymbol mark={mark} size="md" />, listIcon: <RaritySymbol mark={mark} size="md" column /> } : {}),
});
