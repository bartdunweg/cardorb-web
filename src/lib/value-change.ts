import type { ValueSnapshot } from "@/lib/value-history";

/**
 * A period's change, split into what adding cards brought and what prices did.
 *
 * The first reading's additions are left out: they came before the period starts, and the change
 * is measured from that reading on. `value` is the figure shown now, which can include a card added
 * after tonight's reading; that lands in the prices half until the next reading counts it.
 */
export function splitChange(shown: ValueSnapshot[], value: number): { change: number; added: number; prices: number } | null {
    const from = shown[0];
    if (!from) return null;
    const change = Math.round(value) - from.value;
    const added = shown.slice(1).reduce((sum, s) => sum + (s.addedValue ?? 0), 0);
    return { change, added, prices: change - added };
}
