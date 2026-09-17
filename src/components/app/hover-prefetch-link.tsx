"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import Link from "next/link";

/** How long the pointer rests on a link before its page is read. */
const HOVER_INTENT_MS = 100;

/**
 * Ours: a link that reads its whole page once the pointer or the focus is on it.
 *
 * A dynamic page without a loading.js is barely prefetched on sight, so the work starts at the
 * click. Prefetching every link in full on sight is no answer on a shelf of 200 sets: that is 200
 * set reads. Hover sits in between: the 150 to 300 ms between the pointer landing and the click is
 * spent reading, and a page the server keeps (getSet, five minutes) is ready by then. Next has this
 * as `unstable_dynamicOnHover`, missing from its public types in 16.3; this is the same switch.
 *
 * The pointer has to rest a moment first. Crossing a row of tiles on the way somewhere else set off
 * a whole set page render for every tile it passed, seven within a second in the logs; a pointer
 * that leaves inside the delay reads nothing. Focus and touch start at once: both mean this link.
 */
export function HoverPrefetchLink({ onMouseEnter, onMouseLeave, onFocus, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
    const [full, setFull] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancel = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    };
    useEffect(() => cancel, []);
    return (
        <Link
            {...props}
            prefetch={full ? true : null}
            onMouseEnter={(event) => {
                if (!full && !timer.current) timer.current = setTimeout(() => setFull(true), HOVER_INTENT_MS);
                onMouseEnter?.(event);
            }}
            onMouseLeave={(event) => {
                cancel();
                onMouseLeave?.(event);
            }}
            onFocus={(event) => {
                cancel();
                setFull(true);
                onFocus?.(event);
            }}
            onTouchStart={(event) => {
                cancel();
                setFull(true);
                onTouchStart?.(event);
            }}
        />
    );
}
