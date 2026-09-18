"use client";

import { useEffect, useState } from "react";

const isThenable = <T>(value: T | PromiseLike<T>): value is PromiseLike<T> => typeof (value as { then?: unknown } | null)?.then === "function";

/**
 * A value that may still be on its way from the server: `until` first, the value once it is in.
 *
 * For a control a person can press whose props arrive later than the control itself (a binder's
 * menu waits for the facets its edit form offers, Filters for the options its sheet lists). The way
 * this was done before, a Suspense boundary whose fallback was the same control without the value,
 * swapped the control out for a new one when the value came in: a menu or a sheet opened in the
 * meantime closed under the finger, and the press that opened it was lost (CI run 35326656022, the
 * binder's menu). Held here instead, the control stays the one on screen and only its value changes.
 *
 * `until` on the first render in the browser as on the server, whatever the promise has done by
 * then, so hydration draws what the server drew. A rejection keeps `until`, as the fallback did.
 */
export function useArrived<T>(value: T | PromiseLike<T>, until: T): T {
    const [arrived, setArrived] = useState<{ from: PromiseLike<T>; value: T } | null>(null);

    useEffect(() => {
        if (!isThenable(value)) return;
        let current = true;
        value.then(
            (v) => {
                if (current) setArrived({ from: value, value: v });
            },
            () => {},
        );
        return () => {
            current = false;
        };
    }, [value]);

    if (!isThenable(value)) return value;
    return arrived?.from === value ? arrived.value : until;
}
