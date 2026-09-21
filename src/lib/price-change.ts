import { type PeriodKey, changeSaid, forChart } from "@/lib/chart-periods";
import { formatPercent, formatPrice } from "@/lib/format";

export type PriceChange = {
    direction: "up" | "down";
    /** The absolute difference, in euros. */
    amount: number;
    /** The absolute difference as a ratio of the average: 0.05 for five percent. */
    ratio: number;
    /** What the line says: "+€0.12 · 5%". The sign is always there, so colour never carries it alone. */
    text: string;
    /** What a screen reader says: "Up €0.12, 5 percent, in the last 30 days" (changeSaid writes the last part). */
    label: string;
};

/**
 * One price against an earlier one, as the line beside the price reads it. `said` is what the
 * earlier figure was, in the words `changeSaid` writes ("in the last 30 days", "since the first
 * reading"): the reading only a
 * screen reader gets, since the number itself is beside the control that set the window.
 *
 * Nothing under half a percent or under a cent: a card that moved by less than that has not
 * moved, and a "+€0.00 · 0%" would say it had. Nothing either without both figures, or with an
 * earlier figure of zero, which has no percent.
 */
function changeAgainst(price: number | null | undefined, before: number | null | undefined, said: string): PriceChange | null {
    if (price == null || before == null || before <= 0) return null;
    const diff = price - before;
    const amount = Math.abs(diff);
    const ratio = amount / before;
    if (amount < 0.01 || ratio < 0.005) return null;
    const direction = diff > 0 ? "up" : "down";
    const sign = direction === "up" ? "+" : "−";
    return {
        direction,
        amount,
        ratio,
        text: `${sign}${formatPrice(amount)} · ${formatPercent(ratio)}`,
        label: `${direction === "up" ? "Up" : "Down"} ${formatPrice(amount)}, ${Math.round(ratio * 100)} percent, ${said}`,
    };
}

/**
 * How far a card's price moved over the period the chart is showing: its first figure in the
 * window against its last, which is the question Home's Biggest movers answers (`was` → `now`).
 *
 * The figure beside the price used to be the price against its own 30-day average, whatever
 * period the chart under it was drawing, so a card opened from "Biggest movers, in the last 6
 * months" showed a percent nobody could place next to the one that sent them there (Bart,
 * 2026-09-16). It reads the drawn line (chartLine, then forChart: held dips, untrusted stretch,
 * and under Max the week's average the chart draws instead of the day), so the number and the
 * line it sits over always say the same thing; the API's own movers figure is the raw reading, so
 * the two can differ on a line the chart distrusts.
 *
 * Null under two figures in the window: one reading is a price, not a move.
 */
export function periodChange(points: PriceLinePoint[], period: PeriodKey, holo: boolean, printing: string | null): PriceChange | null {
    const line = chartLine(points, printing, holo);
    const within = forChart(line, period);
    if (within.length < 2) return null;
    /* The words are this line's own, not the button's: a printing first priced last week, or one
       whose line the chart distrusts back to last week, said "in the last 6 months" to a screen
       reader over a move that was a week old. Judged on the whole drawn line rather than the
       window's slice of it, the same rule Home's figure follows (changeSaid). */
    return changeAgainst(within[within.length - 1]!.value, within[0]!.value, changeSaid(period, line));
}

/**
 * One printing's line as every reading of it says: its figure each day it has one (valueOf), with a
 * dip that came back held at its level (holdRecoveredDips). What the chart draws from, and what the
 * figure beside the price reads, so the two never apply the rules apart.
 */
export function priceLine(points: PriceLinePoint[], printing: string | null, holo: boolean): { date: string; value: number }[] {
    return holdRecoveredDips(
        points.map((p) => ({ date: p.date, value: valueOf(p, printing, holo) })).filter((p): p is { date: string; value: number } => p.value != null),
    );
}

/**
 * The line a card's chart draws: `priceLine`, from its last jump where it contradicts itself
 * (trustedStretch), with the lower bar for a 1st Edition or Shadowless run. A held dip is no jump
 * to start from, so the dips are held first.
 */
export function chartLine(points: PriceLinePoint[], printing: string | null, holo: boolean): { date: string; value: number }[] {
    return trustedStretch(priceLine(points, printing, holo), isScarceRun(printing) ? SCARCE_RUN_JUMP_RATIO : undefined);
}

/** One day of a card's price line as the API answers it. */
export type PriceLinePoint = { date: string; market: number | null; holo: number | null; printings?: Record<string, number> };

/**
 * One day's figure for one series: the named printing where one is asked for, the foil or the plain
 * line otherwise, and never another series standing in on a day this one has no figure. A reverse
 * copy read the plain price on a day its foil had none, the same mixing cardorb-api#443 took out.
 */
export function valueOf(point: PriceLinePoint, printing: string | null, holo: boolean): number | null {
    if (printing) return point.printings?.[printing] ?? null;
    return (holo ? point.holo : point.market) ?? null;
}

/** TCGplayer's printings in the order a person reads them, with the words the sheet shows. */
const PRINTING_LABELS: [string, string][] = [
    ["normal", "Normal"],
    ["unlimited", "Unlimited"],
    ["holofoil", "Holo"],
    ["unlimited-holofoil", "Unlimited Holo"],
    ["reverse-holofoil", "Reverse Holo"],
    // A patterned reverse's own TCGplayer product, filed under the card since cardorb-api#454.
    ["poke-ball-reverse-holofoil", "Poké Ball Reverse"],
    ["master-ball-reverse-holofoil", "Master Ball Reverse"],
    ["energy-symbol-reverse-holofoil", "Energy Symbol Reverse"],
    ["friend-ball-reverse-holofoil", "Friend Ball Reverse"],
    ["love-ball-reverse-holofoil", "Love Ball Reverse"],
    ["quick-ball-reverse-holofoil", "Quick Ball Reverse"],
    ["dusk-ball-reverse-holofoil", "Dusk Ball Reverse"],
    ["team-rocket-reverse-holofoil", "Team Rocket Reverse"],
    ["1st-edition", "1st Edition"],
    ["1st-edition-holofoil", "1st Edition Holo"],
    ["shadowless", "Shadowless"],
    ["shadowless-holofoil", "Shadowless Holo"],
    // My First Battle's Blue Border print, a TCGplayer product of its own (cardorb-api#492).
    ["blue-border", "Blue Border"],
    // The foil pattern prints, each a TCGplayer product of its own (cardorb-api#512).
    ["cosmos-holofoil", "Cosmos Holo"],
    ["cosmos-reverse-holofoil", "Cosmos Reverse"],
    ["cosmos-normal", "Cosmos"],
    ["cracked-ice-holofoil", "Cracked Ice Holo"],
    ["cracked-ice-reverse-holofoil", "Cracked Ice Reverse"],
    ["cracked-ice-normal", "Cracked Ice"],
];

/** The printings a card has readings for, in reading order, each with its label. */
export function printingsOfLine(points: PriceLinePoint[]): { key: string; label: string }[] {
    const seen = new Set(points.flatMap((p) => Object.keys(p.printings ?? {})));
    return PRINTING_LABELS.filter(([key]) => seen.has(key)).map(([key, label]) => ({ key, label }));
}

/** How far apart two neighbouring figures of one line are before the step between them is a jump. */
const JUMP_RATIO = 5;

/**
 * The part of a price line worth drawing: all of it, or, where the line contradicts itself, what
 * follows its last jump.
 *
 * A line that jumps five times or more between two neighbouring figures, and does so at least twice,
 * is not a price that moved: it is a market that files two different figures under one printing.
 * Base Set Charizard's 1st Edition read about €400 on TCGplayer's weekly readings through 2024, then
 * €5,266, €431, €261 and €3,563 by the end of 2025; a first edition Charizard never sold for €400,
 * and the API cannot tell which half is true (cardorb-api#493). Bart, 2026-09-15: hide the old part.
 * One jump alone stays drawn: a corrected link or a real move, and nothing after it says otherwise.
 * On 2026-09-15 this cut 6 of the 1,980 lines of the cards with a 1st Edition or Shadowless run.
 *
 * `ratio` is lower for a scarce run (SCARCE_RUN_JUMP_RATIO): the 1st Edition and Shadowless prints are
 * where the old weekly readings disagree most, and Charizard's 1st Edition still opened at €3,600
 * before its €8,480 in April (Bart, 2026-09-15: "begint laag"). At twice, 33 of those 1,041 lines start
 * later; for every card it would have cut 561 lines in three months, so the bar stays at five there.
 */
export function trustedStretch<T extends { value: number }>(line: T[], ratio = JUMP_RATIO): T[] {
    let jumps = 0;
    let last = 0;
    for (let i = 1; i < line.length; i++) {
        const a = line[i - 1].value;
        const b = line[i].value;
        if (Math.min(a, b) > 0 && Math.max(a, b) >= Math.min(a, b) * ratio) {
            jumps++;
            last = i;
        }
    }
    return jumps >= 2 ? line.slice(last) : line;
}

/** A scarce run's key: the 1st Edition and Shadowless printings, which draw from their last doubling. */
const SCARCE_RUN_JUMP_RATIO = 2;
const isScarceRun = (printing: string | null | undefined): boolean => !!printing && /^(1st-edition|shadowless)/.test(printing);

/** How far a figure falls (or rises by the inverse) from the level before it to count as a dip. */
const DIP = 0.6;
/** How near the level the figure after the dip must come back, either way. */
const RECOVERED = 0.8;
/** How long a dip may last, from its first figure to the figure that comes back. */
const DIP_DAYS = 21;

/**
 * A price line with a dip that comes back held flat over it.
 *
 * A figure 40% or more under the level before it (or 1⅔ times over it), for as long as the figures
 * stay that far off, and followed within three weeks by one back within 20% of that level, is one
 * cheap copy sold or one hopeful sale: the price did not go there. Base Set Charizard's Shadowless run
 * read €1,869, then €1,000 to €1,099 for eleven days from 31 August 2026 while copies in poor shape
 * were listed, then €1,948, and the chart showed a collapse nobody could place (Bart, 2026-09-15).
 * The level is held over it, the same way the line holds a figure until the next sale.
 *
 * A dip at the end of the line has nothing after it to come back to and stays drawn: it may be the
 * new price. On English cards from June to September 2026 this held 2,457 figures in 507 of 35,832
 * lines.
 */
export function holdRecoveredDips<T extends { date: string; value: number }>(line: T[]): T[] {
    const time = (p: T) => Date.parse(`${p.date}T00:00:00Z`);
    let out: T[] | null = null;
    for (let i = 1; i < line.length; i++) {
        const level = (out ?? line)[i - 1].value;
        const off = (v: number) => v < level * DIP || v * DIP > level;
        if (!(level > 0) || !off(line[i].value)) continue;
        let j = i;
        while (j + 1 < line.length && off(line[j + 1].value)) j++;
        const back = line[j + 1];
        if (!back || time(back) - time(line[i]) > DIP_DAYS * 86_400_000) {
            i = j;
            continue;
        }
        if (back.value < level * RECOVERED || back.value * RECOVERED > level) {
            i = j;
            continue;
        }
        out ??= [...line];
        for (let k = i; k <= j; k++) out[k] = { ...line[k], value: level };
        i = j;
    }
    return out ?? line;
}
