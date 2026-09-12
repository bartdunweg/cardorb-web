"use client";

import { useEffect, useRef } from "react";

/**
 * The props that make a button warm what pressing it will need.
 *
 * Hover, and only once the pointer has rested for 150 ms: a pointer crossing a grid on its way
 * somewhere else touches a dozen tiles, and asking for each would be a dozen requests for
 * nothing. Focus warms at once: a keyboard lands on a tile on purpose. React Aria's hover
 * ignores the hover a touch screen emulates, so a phone warms nothing and its tap opens the
 * sheet as before. Nothing happens without `warm`: a tile that leads nowhere has nothing to ask.
 */
export function useWarm(warm?: () => void) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clear = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    };
    useEffect(() => clear, []);
    if (!warm) return {};
    return {
        onHoverStart: () => {
            clear();
            timer.current = setTimeout(warm, 150);
        },
        onHoverEnd: clear,
        onFocus: warm,
    };
}
