/**
 * Where a signed-in page spends its time, one line per step in the function's log.
 *
 * A page here is middleware (the session check at Supabase), then the layout's reads (profile,
 * folders, stats: cached five minutes per person), then the page's own reads at the API. None of
 * that is visible from outside: the browser sees one number, time to first byte. These lines make
 * each step visible in `vercel logs`, so a slow page can be traced to the step that was slow
 * rather than guessed at. Cheap enough to leave on: one `console.info` per step.
 */

export function elapsed(since: number): number {
    return Math.round(performance.now() - since);
}

export function logTiming(label: string, ms: number, detail?: string): void {
    console.info(`[timing] ${label} ${ms}ms${detail ? ` ${detail}` : ""}`);
}

/** Runs `work` and logs how long it took under `label`, whether it resolved or threw. */
export async function timed<T>(label: string, work: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
        return await work();
    } finally {
        logTiming(label, elapsed(start));
    }
}
