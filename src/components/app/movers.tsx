"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button as AriaButton } from "react-aria-components";
import { CardImage } from "@/components/app/card-image";
import { PERIODS, type PeriodKey } from "@/components/app/chart-periods";
import { useHomePeriod } from "@/components/app/home-period";
import { notify } from "@/components/app/toast";
import { cardLine, copyLine } from "@/lib/card-label";
import type { Card } from "@/lib/cards";
import { formatPrice } from "@/lib/format";
import type { Mover } from "@/lib/movers";
import { listRows, moversFor } from "@/lib/reads";
import { TILE_SURFACE } from "@/lib/tile";
import { cx } from "@/utils/cx";

// The card sheet, fetched on the tap that opens it, as the other lists on Home have it.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

type Answer = { up: Mover[]; down: Mover[] } | null;

/** The counts' tile (StatCard), with room inside. */
const TILE = `${TILE_SURFACE} p-4 sm:p-5`;

/**
 * Ours: the cards whose price moved most over the period the value chart shows, under Home's counts.
 *
 * It says why the number above moved: the change is prices, and these are the prices that made it.
 * Ranked by what the move did to the collection (the change times the copies held), so a Charizard
 * that gained eight euros comes before a common that doubled from four cents. Up and Down are two tiles
 * like the counts above them, side by side from `sm`, one under the other on a phone. The period is the chart's: each is asked for the
 * first time it is chosen and kept, so switching back is instant. The sign carries the direction as
 * well as the colour.
 */
export function Movers() {
    const { period } = useHomePeriod();
    const said = (PERIODS.find((p) => p.key === period) ?? PERIODS[1]).said;
    const [answers, setAnswers] = useState<Partial<Record<PeriodKey, Answer>>>({});
    const known = period in answers;
    // A period whose read failed is asked again when it is chosen again, not remembered as failed.
    const failed = answers[period] === null;
    useEffect(() => {
        if (known && !failed) return;
        let current = true;
        void moversFor(period).then((answer) => {
            if (current) setAnswers((a) => ({ ...a, [period]: answer }));
        });
        return () => {
            current = false;
        };
        // Not on `failed` itself: that would ask again straight after every failure.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);
    const answer = answers[period];
    /* Each tile leads to the whole collection sorted its way, over the same period (list-query.ts). */
    const listOf = (sort: "change-desc" | "change-asc") => `/dashboard/cards?sort=${sort}${period === "1m" ? "" : `&period=${period}`}`;

    /* A row opens the card's sheet on your own row of it, read by set, number and name the way the set
       page opens a card, and the arrows step through Up and then Down. `at` is where in that list the
       open card is; a tap that finds no row (sold since the reading, or a read that failed) leaves the
       sheet as it was and says so. */
    const all = answer ? [...answer.up, ...answer.down] : [];
    const [open, setOpen] = useState<{ card: Card; at: number } | null>(null);
    /* Only the last tap or arrow counts: an earlier read that answers late does not open its card over
       the one asked for after it. `heading` is where that last ask was going, so a second arrow pressed
       before the first one's row is in steps on from there rather than from the card still shown. */
    const asked = useRef(0);
    const heading = useRef<number | null>(null);
    const show = async (at: number) => {
        const m = all[at];
        if (!m) return;
        const ask = ++asked.current;
        heading.current = at;
        const rows = await listRows({ set: m.set, number: m.number, name: m.name, tcg_id: m.tcgId });
        if (ask !== asked.current) return;
        heading.current = null;
        const row = rows.find((r) => r.owned) ?? rows[0];
        if (row) setOpen({ card: row, at });
        else notify.failed(`${m.name} could not be opened`, { description: "Its row could not be read. Try again in a moment." });
    };
    const stepBy = (by: number) => {
        const from = heading.current ?? open?.at;
        if (from !== undefined && all[from + by]) void show(from + by);
    };
    const hasPrev = Boolean(open && all[open.at - 1]);
    const hasNext = Boolean(open && all[open.at + 1]);
    const close = () => {
        // A read still out for the sheet just closed must not open it again.
        asked.current++;
        heading.current = null;
        setOpen(null);
    };

    return (
        <section aria-labelledby="movers-heading" className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
                <div className="flex flex-col">
                    <h2 id="movers-heading" className="text-md font-semibold text-primary">
                        Biggest movers
                    </h2>
                    <p className="text-sm text-tertiary">{said[0]!.toUpperCase() + said.slice(1)}</p>
                </div>
            </div>
            {!known ? (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4" aria-hidden="true">
                    {[0, 1].map((col) => (
                        <div key={col} className={cx(TILE, "flex flex-col gap-3")}>
                            <span className="h-4 w-16 rounded-md bg-skeleton motion-safe:animate-pulse" />
                            {[0, 1, 2].map((row) => (
                                <span key={row} className="h-12 rounded-md bg-skeleton motion-safe:animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : answer === null || answer === undefined ? (
                <p className="text-sm text-tertiary">Price moves could not be read right now.</p>
            ) : answer.up.length === 0 && answer.down.length === 0 ? (
                <p className="text-sm text-tertiary">No card moved more than ten cents in this period.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    <MoverList
                        title="Up"
                        movers={answer.up}
                        empty="No card went up."
                        onOpen={(i) => void show(i)}
                        href={listOf("change-desc")}
                        linkLabel="See all gains"
                    />
                    <MoverList
                        title="Down"
                        movers={answer.down}
                        empty="No card went down."
                        onOpen={(i) => void show(answer.up.length + i)}
                        href={listOf("change-asc")}
                        linkLabel="See all losses"
                    />
                </div>
            )}
            {/* On this list's own period, so the card's price line and the figure beside it answer the
                question the row did: what it did over these months (Bart, 2026-09-16). */}
            <CardDetailSlideout
                card={open?.card ?? null}
                onClose={close}
                onPrev={hasPrev ? () => stepBy(-1) : null}
                onNext={hasNext ? () => stepBy(1) : null}
                period={period}
            />
        </section>
    );
}

/** A mover's printing and state in the words every list uses; null where the API said nothing. */
const moverLine = (m: Mover) => copyLine({ finish: m.finish, foil_pattern: m.foilPattern, edition: m.edition, condition: m.condition, grade: m.grade });

function MoverList({
    title,
    movers,
    empty,
    onOpen,
    href,
    linkLabel,
}: {
    title: string;
    movers: Mover[];
    empty: string;
    onOpen: (index: number) => void;
    href: string;
    /** The link's words for a screen reader; on screen it says See all under its tile's heading. */
    linkLabel: string;
}) {
    return (
        <div className={cx(TILE, "flex flex-col gap-3")}>
            <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-tertiary">{title}</h3>
                <Link href={href} aria-label={linkLabel} className="text-sm font-semibold text-brand-secondary outline-focus-ring focus-visible:outline-2">
                    See all
                </Link>
            </div>
            {movers.length === 0 ? (
                <p className="text-sm text-tertiary">{empty}</p>
            ) : (
                <ol className="flex flex-col gap-1">
                    {movers.map((m, i) => (
                        <li key={m.tcgId}>
                            {/* The whole row opens the card. It reaches past the tile's padding by 8 px so the
                                hover tint has room around the picture and the numbers. */}
                            <AriaButton
                                onPress={() => onOpen(i)}
                                aria-label={`${m.name}, ${m.set}: ${m.total > 0 ? "up" : "down"} ${formatPrice(Math.abs(m.total))}`}
                                className="-mx-2 flex w-[calc(100%+1rem)] pressable cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-focus-ring transition-colors hover:bg-alpha-black/4 data-focus-visible:outline-2"
                            >
                                <div className="relative aspect-card w-9 shrink-0 overflow-hidden rounded-sm bg-quaternary">
                                    {m.image ? <CardImage src={m.image} alt="" width={72} className="object-cover" /> : null}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-medium text-primary">{m.name}</span>
                                    <span className="truncate text-xs text-tertiary">
                                        {/* The code and number printed on the card and its rarity, as the lists show them (card-label.ts). */}
                                        {cardLine({
                                            set_name: m.set,
                                            set_abbr: m.setAbbr ?? null,
                                            number: m.number,
                                            printed_number: m.printedNumber ?? null,
                                            rarity: m.rarity,
                                        })}
                                        {m.copies > 1 ? ` · ×${m.copies}` : ""}
                                    </span>
                                    {/* The second line every list has: the printing and the state, "Holo · Near Mint"
                                        (copyLine). A mover is a card, so the API says it only where every copy held
                                        answers the same (cardorb-api#516); where they differ there is no line. */}
                                    {moverLine(m) ? <span className="truncate text-xs text-tertiary">{moverLine(m)}</span> : null}
                                </div>
                                {/* The price now large, and what it did under it, small: the card's price is
                                    what you look for, the move is why it is on the list (Bart, 2026-09-15). */}
                                <div className="flex shrink-0 flex-col items-end">
                                    <span className="text-sm font-medium text-primary tabular-nums">{formatPrice(m.now)}</span>
                                    <span className={cx("text-xs font-medium tabular-nums", m.total > 0 ? "text-success-primary" : "text-error-primary")}>
                                        {m.total > 0 ? "+" : "−"}
                                        {formatPrice(Math.abs(m.total))}
                                    </span>
                                </div>
                            </AriaButton>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
