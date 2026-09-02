"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
    /** Shorter terms clear the results without asking. */
    minLength?: number;
    /** Milliseconds of quiet before the search fires. */
    delay?: number;
};

/**
 * Results for a search box: waits for the typing to pause, asks once, and ignores an answer that
 * arrives after a newer question was asked. `search` is read through a ref, so a new function
 * identity on every render does not restart the timer; only the term does.
 */
export function useDebouncedSearch<T>(query: string, search: (term: string) => Promise<T[]>, { minLength = 1, delay = 250 }: Options = {}) {
    const [results, setResults] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef(search);
    searchRef.current = search;
    const reqId = useRef(0);

    useEffect(() => {
        const term = query.trim();
        const id = ++reqId.current;
        // All state changes live inside the timer, so none run synchronously in the effect.
        const t = setTimeout(async () => {
            if (term.length < minLength) {
                setResults([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const found = await searchRef.current(term);
            if (id === reqId.current) {
                setResults(found);
                setLoading(false);
            }
        }, delay);
        return () => clearTimeout(t);
    }, [query, minLength, delay]);

    return { results, loading };
}
