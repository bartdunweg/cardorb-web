"use client";

import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import type { SetSeries } from "@/lib/sets";
import { cx } from "@/utils/cx";

const n = (v: number) => v.toLocaleString("en-US");

// Every set there has been, as a list under the search: series by series, each set a row with
// its logo, name and how many of it you hold, leading to the set's page. The same shelf Browse
// draws, in rows rather than tiles, because it sits in a sheet.
export function SetsShelfList({ series, onNavigate }: { series: SetSeries[]; onNavigate?: () => void }) {
    return (
        <div className="flex flex-col gap-5">
            {series.map((group) => (
                <section key={group.name} className="flex flex-col gap-1">
                    <h3 className="px-2 text-xs font-semibold text-quaternary uppercase">{group.name}</h3>
                    <ul className="flex flex-col">
                        {group.sets.map((set) => (
                            <li key={set.id}>
                                <Link
                                    href={`/dashboard/sets/${encodeURIComponent(set.id)}`}
                                    onClick={onNavigate}
                                    className={cx(
                                        "flex pressable items-center gap-3 rounded-lg p-2 outline-focus-ring transition-colors hover:bg-secondary focus-visible:outline-2",
                                        set.owned === 0 && "opacity-70 hover:opacity-100",
                                    )}
                                >
                                    <div className="relative flex size-10 shrink-0 items-center justify-center">
                                        {set.logoUrl ? (
                                            <CardImage src={set.logoUrl} alt="" width={96} ratio="square" className="object-contain" />
                                        ) : (
                                            <div className="size-full rounded-md bg-secondary" />
                                        )}
                                    </div>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{set.name}</span>
                                    <span className="shrink-0 text-xs text-tertiary tabular-nums">
                                        {n(set.owned)} of {n(set.total)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
