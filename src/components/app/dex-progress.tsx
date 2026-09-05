import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import type { DexList } from "@/lib/dex-groups";

// The bar under a Pokédex's title: how many of the range are caught. Awaits the same promise
// the slots come from, inside its own boundary, so the title is on screen before the count.
export async function DexProgress({ dex, label }: { dex: Promise<DexList>; label: string }) {
    const d = await dex;
    const span = d.range.to - d.range.from + 1;
    return <ProgressBarBase value={d.caught} max={span} className="mt-2 max-w-md" aria-label={label} />;
}
