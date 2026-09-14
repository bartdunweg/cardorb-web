"use client";

import { useEffect, useState } from "react";
import { moversFor } from "@/app/(app)/dashboard/(home)/actions";
import { CardImage } from "@/components/app/card-image";
import type { PeriodKey } from "@/components/app/chart-periods";
import { formatPrice } from "@/lib/format";
import type { Mover } from "@/lib/movers";
import { cx } from "@/utils/cx";

type Answer = { up: Mover[]; down: Mover[] } | null;

/**
 * Ours: the cards whose price moved most over the period the value chart shows, under it on Home.
 *
 * It says why the number above moved: the change is prices, and these are the prices that made it.
 * Ranked by what the move did to the collection (the change times the copies held), so a Charizard
 * that gained eight euros comes before a common that doubled from four cents. Risers and fallers side
 * by side from `sm`, one under the other on a phone. The period is the chart's: each is asked for the
 * first time it is chosen and kept, so switching back is instant. The sign carries the direction as
 * well as the colour.
 */
export function Movers({ period, said }: { period: PeriodKey; said: string }) {
    const [answers, setAnswers] = useState<Partial<Record<PeriodKey, Answer>>>({});
    const known = period in answers;
    useEffect(() => {
        if (known) return;
        let current = true;
        void moversFor(period).then((answer) => {
            if (current) setAnswers((a) => ({ ...a, [period]: answer }));
        });
        return () => {
            current = false;
        };
    }, [period, known]);
    const answer = answers[period];

    return (
        // mt-2 on the hero's own 16 px gap: the 24 px Home keeps between its blocks, since this is one of them.
        <section aria-labelledby="movers-heading" className="mt-2 flex flex-col gap-4">
            <div className="flex flex-col">
                <h2 id="movers-heading" className="text-md font-semibold text-primary">
                    Biggest movers
                </h2>
                <p className="text-sm text-tertiary">{said[0]!.toUpperCase() + said.slice(1)}</p>
            </div>
            {!known ? (
                <div className="grid gap-6 sm:grid-cols-2" aria-hidden="true">
                    {[0, 1].map((col) => (
                        <div key={col} className="flex flex-col gap-3">
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
                <div className="grid gap-6 sm:grid-cols-2">
                    <MoverList title="Up" movers={answer.up} empty="No card went up." />
                    <MoverList title="Down" movers={answer.down} empty="No card went down." />
                </div>
            )}
        </section>
    );
}

function MoverList({ title, movers, empty }: { title: string; movers: Mover[]; empty: string }) {
    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-tertiary">{title}</h3>
            {movers.length === 0 ? (
                <p className="text-sm text-tertiary">{empty}</p>
            ) : (
                <ol className="flex flex-col gap-3">
                    {movers.map((m) => (
                        <li key={m.tcgId} className="flex items-center gap-3">
                            <div className="relative aspect-card w-9 shrink-0 overflow-hidden rounded-sm bg-quaternary">
                                {m.image ? <CardImage src={m.image} alt="" width={72} className="object-cover" /> : null}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-medium text-primary">{m.name}</span>
                                <span className="truncate text-xs text-tertiary">
                                    {m.set}
                                    {m.copies > 1 ? ` · ×${m.copies}` : ""}
                                </span>
                            </div>
                            <div className="flex shrink-0 flex-col items-end">
                                <span className={cx("text-sm font-medium tabular-nums", m.total > 0 ? "text-success-primary" : "text-error-primary")}>
                                    {m.total > 0 ? "+" : "−"}
                                    {formatPrice(Math.abs(m.total))}
                                </span>
                                <span className="text-xs text-tertiary tabular-nums">
                                    {formatPrice(m.was)} → {formatPrice(m.now)}
                                </span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
