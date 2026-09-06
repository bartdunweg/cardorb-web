"use client";

import { useEffect, useRef, useState } from "react";

type Options<P> = {
    /** Shorter terms clear the results without asking; a filter that is set waives it. */
    minLength?: number;
    /** Milliseconds of quiet before the search fires. */
    delay?: number;
    /** Filters beside the term, handed to `search` as its second argument; a change fires a search like a keystroke does. */
    params?: P;
};

const isSet = (params: object | undefined) => Boolean(params && Object.values(params).some((v) => v !== undefined && v !== "" && v !== null));

/**
 * Results for a search box: waits for the typing to pause, asks once, and ignores an answer that
 * arrives after a newer question was asked. `search` is read through a ref, so a new function
 * identity on every render does not restart the timer; only the term and the filters do.
 */
export function useDebouncedSearch<T, P extends object = Record<string, never>>(
    query: string,
    search: (term: string, params: P) => Promise<T[]>,
    { minLength = 1, delay = 250, params }: Options<P> = {},
) {
    const [results, setResults] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef(search);
    searchRef.current = search;
    const paramsRef = useRef(params);
    paramsRef.current = params;
    const reqId = useRef(0);
    // Filters are compared by value: a caller building the object on every render must not restart the timer.
    const paramsKey = JSON.stringify(params ?? null);

    useEffect(() => {
        const term = query.trim();
        const id = ++reqId.current;
        // All state changes live inside the timer, so none run synchronously in the effect.
        const t = setTimeout(async () => {
            const current = paramsRef.current;
            if (term.length < minLength && !isSet(current)) {
                setResults([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const found = await searchRef.current(term, (current ?? {}) as P);
            if (id === reqId.current) {
                setResults(found);
                setLoading(false);
            }
        }, delay);
        return () => clearTimeout(t);
    }, [query, minLength, delay, paramsKey]);

    return { results, loading };
}
