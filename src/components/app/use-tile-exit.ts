"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * A tile that leaves its list (a count stepped to nought, a wish un-hearted) fades and shrinks a
 * little before it is taken out, rather than vanishing under the pointer. The list is not told:
 * the state is the tile's own, so no other tile and not the list draws again, and the neighbours
 * close the gap in one move once it is gone.
 *
 * `gone` is whether the tile should be off the list now. `removed` turns true when the exit has
 * finished (or was cancelled), and is when the tile renders nothing. If the tile is wanted back
 * while it is still leaving (a failed write puts the count back), the exit is cancelled and the
 * tile stays. Opacity 1 to 0 and scale 1 to 0.96 on --duration-fast with --ease-enter; reduced
 * motion keeps the fade and drops the shrink. Pointer events are off for the length of it.
 */
export function useTileExit(gone: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const [exited, setExited] = useState(false);
    // A tile that was never on screen (a row at nought when the list drew) has nothing to fade.
    const [shown, setShown] = useState(!gone);
    if (!gone && !shown) setShown(true);
    // Wanted back after it left: drawn again, as it was before this hook.
    if (!gone && exited) setExited(false);
    const canAnimate = typeof Element !== "undefined" && typeof Element.prototype.animate === "function";

    useLayoutEffect(() => {
        const el = ref.current;
        if (!gone || !el || !canAnimate) return;
        const tokens = getComputedStyle(el);
        const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.style.pointerEvents = "none";
        const exit = el.animate(
            reduce
                ? [{ opacity: 1 }, { opacity: 0 }]
                : [
                      { opacity: 1, transform: "scale(1)" },
                      { opacity: 0, transform: "scale(0.96)" },
                  ],
            {
                duration: parseFloat(tokens.getPropertyValue("--duration-fast")) || 150,
                easing: tokens.getPropertyValue("--ease-enter").trim() || "ease-out",
                fill: "forwards",
            },
        );
        let live = true;
        const leave = () => {
            if (live) setExited(true);
        };
        exit.onfinish = leave;
        exit.oncancel = leave;
        return () => {
            // Wanted back, or the tile itself unmounted: the cancel here is ours and removes nothing.
            live = false;
            exit.cancel();
            el.style.pointerEvents = "";
        };
    }, [gone, canAnimate]);

    return { ref, removed: gone && (exited || !shown || !canAnimate) };
}
