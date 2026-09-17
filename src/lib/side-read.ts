import { unstable_rethrow } from "next/navigation";

/**
 * A read a page can do without: its failure is logged and `fallback` stands in, so one section
 * stays empty or hidden rather than the whole page falling through to its error screen. A redirect
 * or a not-found (and Next's own signals while prerendering) still pass through.
 */
export async function sideRead<T>(name: string, read: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await read();
    } catch (error) {
        unstable_rethrow(error);
        console.error(`side read ${name} failed`, error);
        return fallback;
    }
}
