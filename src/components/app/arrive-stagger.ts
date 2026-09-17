/**
 * The wave a list's first tiles arrive in (the `arrive` utility in globals.css): tile i waits
 * i steps of --stagger-step, up to eight, so the first rows come one after another in at most
 * 160 ms. Only tiles of the first page wave. A batch appended on scroll and a card the list read
 * again arrive at once: capped at twelve or sixteen steps, every one of them waited 240 to 320 ms.
 */
export const ARRIVE_STAGGER_CAP = 8;

export function arriveSteps(index: number, firstPage: boolean): number {
    return firstPage ? Math.min(index, ARRIVE_STAGGER_CAP) : 0;
}

/** The `--arrive-delay` a tile carries. */
export function arriveDelay(index: number, firstPage: boolean): string {
    const steps = arriveSteps(index, firstPage);
    return steps === 0 ? "0ms" : `calc(${steps} * var(--stagger-step))`;
}
