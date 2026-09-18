/** Anything with a left and a right edge on screen: a DOMRect, or a pair of numbers in a test. */
export interface Edges {
    left: number;
    right: number;
}

/**
 * Where the sliding underline goes: the selected tab's box read against the box the line is
 * positioned in, snapped to whole device pixels.
 *
 * Two things were wrong while the line read `offsetWidth` against the tab list's own box. A list
 * that runs wider than the line's container (the card sheet's printings, `-mx-6 px-6` with the
 * scrolling on the list itself) put the line 24 px to the right of its tab. And `offsetWidth` is a
 * whole number where a tab's box is not, so the line's right edge missed the tab's by up to half a
 * pixel while its left edge sat on it, which reads as a line that is not square under its tab.
 *
 * Both edges are snapped to the device pixel grid, so the line keeps two hard edges instead of a
 * soft one at either end. `ratio` is `window.devicePixelRatio`; 1 leaves it on whole CSS pixels.
 */
export const underlinePlace = (tab: Edges, container: Edges, ratio = 1): { left: number; width: number } => {
    const snap = (value: number) => (ratio > 0 ? Math.round(value * ratio) / ratio : value);

    // Snapped where they are on screen and only then counted from the container, so that a
    // container standing on half a pixel itself cannot put the line back between two of them.
    const left = snap(tab.left) - container.left;
    const right = snap(tab.right) - container.left;

    return { left, width: Math.max(0, right - left) };
};
