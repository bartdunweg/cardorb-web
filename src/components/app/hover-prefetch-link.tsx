"use client";

import { type ComponentProps, useState } from "react";
import Link from "next/link";

/**
 * Ours: a link that reads its whole page once the pointer or the focus is on it.
 *
 * A dynamic page without a loading.js is barely prefetched on sight, so the work starts at the
 * click. Prefetching every link in full on sight is no answer on a shelf of 200 sets: that is 200
 * set reads. Hover sits in between: the 150 to 300 ms between the pointer landing and the click is
 * spent reading, and a page the server keeps (getSet, five minutes) is ready by then. Next has this
 * as `unstable_dynamicOnHover`, missing from its public types in 16.3; this is the same switch.
 */
export function HoverPrefetchLink({ onMouseEnter, onFocus, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
    const [full, setFull] = useState(false);
    return (
        <Link
            {...props}
            prefetch={full ? true : null}
            onMouseEnter={(event) => {
                setFull(true);
                onMouseEnter?.(event);
            }}
            onFocus={(event) => {
                setFull(true);
                onFocus?.(event);
            }}
            onTouchStart={(event) => {
                setFull(true);
                onTouchStart?.(event);
            }}
        />
    );
}
