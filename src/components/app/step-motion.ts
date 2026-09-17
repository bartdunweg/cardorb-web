/**
 * How a card sheet's picture comes in after a step through the list, decided apart from the element
 * so it can be read in one place and tested without a browser.
 *
 * - A step from the arrow keys is the fast road through a list: no slide, a short fade on
 *   --duration-instant. A held key repeats about thirty times a second, and each repeat restarting
 *   a fade read as flicker, so a repeat draws the picture with no animation at all.
 * - A step from the chevrons is a single press you watch: the picture slides 12 px from the side
 *   of the arrow over --duration-base.
 * - No step (the sheet opened on the card, or a printing was pressed): the fade on --duration-base.
 * - Reduced motion keeps the fade and drops the travel.
 */
export type StepFrom = {
    /** Which way the list was stepped; 0 when the picture changed without a step. */
    dir: -1 | 0 | 1;
    /** Whether the step came from the keyboard rather than a pointer. */
    key: boolean;
    /** A key held down and repeating (`KeyboardEvent.repeat`). */
    repeat: boolean;
};

export type StepMotion = {
    /** Pixels the picture travels in from; 0 for a fade in place. */
    travel: number;
    duration: "instant" | "base";
} | null;

export const STEP_TRAVEL = 12;

export function stepMotion(from: StepFrom, reducedMotion: boolean): StepMotion {
    if (from.dir !== 0 && from.key) return from.repeat ? null : { travel: 0, duration: "instant" };
    const travel = from.dir !== 0 && !reducedMotion ? from.dir * STEP_TRAVEL : 0;
    return { travel, duration: "base" };
}
