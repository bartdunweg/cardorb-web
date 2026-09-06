"use client";

import { useEffect } from "react";

// While a sheet or dialog is open, Safari's bars take the page's colour under the overlay. Left to
// itself Safari notices the overlay a beat after it has faded in, so the bars darken late. This
// sets the theme-color meta to the overlaid page colour the moment the overlay mounts, and puts it
// back when the overlay starts to leave, so the bars move with the page. Safari animates the bar
// itself; the timing of that is its own.
export function OverlayThemeColor({ exiting = false }: { exiting?: boolean }) {
    useEffect(() => {
        if (exiting) return;
        const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
        const probe = document.createElement("div");
        probe.style.display = "none";
        document.body.append(probe);
        const before = metas.map((meta) => {
            const content = meta.content;
            // The overlay is bg-overlay at 70 % over the page: the same mix, read back as a colour.
            probe.style.backgroundColor = `color-mix(in srgb, var(--color-bg-overlay) 70%, ${content})`;
            meta.content = getComputedStyle(probe).backgroundColor || content;
            return content;
        });
        probe.remove();
        return () => {
            metas.forEach((meta, i) => {
                meta.content = before[i];
            });
        };
    }, [exiting]);
    return null;
}
