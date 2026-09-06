/**
 * Where the light is on the card, from where the pointer or the phone is.
 *
 * The numbers are the source effect's (Card.svelte `interact` and `orientate`): a pointer's place
 * on the card as a percentage, the tilt at a fourteenth of a degree per percent from the centre,
 * and the foil's background offset squeezed into the middle third, so the pattern slides without
 * running off the card.
 */

export type Pose = {
    rotate: { x: number; y: number };
    glare: { x: number; y: number; o: number };
    background: { x: number; y: number };
};

export const round = (value: number, precision = 3): number => parseFloat(value.toFixed(precision));
export const clamp = (value: number, min = 0, max = 100): number => Math.min(Math.max(value, min), max);
export const adjust = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number =>
    round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));

/** The card lying flat: no tilt, no light. */
export const REST: Pose = { rotate: { x: 0, y: 0 }, glare: { x: 50, y: 50, o: 0 }, background: { x: 50, y: 50 } };

/** A light from the top left and no tilt: what the card shows when motion is not wanted. */
export const STATIC_POSE: Pose = { rotate: { x: 0, y: 0 }, glare: { x: 25, y: 10, o: 1 }, background: { x: 44, y: 36 } };

export function poseFromPointer(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Pose {
    const px = clamp(round((100 / rect.width) * (clientX - rect.left)));
    const py = clamp(round((100 / rect.height) * (clientY - rect.top)));
    return {
        rotate: { x: round(-((px - 50) / 3.5)), y: round((py - 50) / 3.5) },
        glare: { x: px, y: py, o: 1 },
        background: { x: adjust(px, 0, 100, 37, 63), y: adjust(py, 0, 100, 33, 67) },
    };
}

/** From the phone's tilt, relative to how it was held when the card opened. */
export function poseFromOrientation(gamma: number, beta: number): Pose {
    const limit = { x: 16, y: 18 };
    const x = clamp(gamma, -limit.x, limit.x);
    const y = clamp(beta, -limit.y, limit.y);
    return {
        rotate: { x: round(-x), y: round(y) },
        glare: { x: adjust(x, -limit.x, limit.x, 0, 100), y: adjust(y, -limit.y, limit.y, 0, 100), o: 1 },
        background: { x: adjust(x, -limit.x, limit.x, 37, 63), y: adjust(y, -limit.y, limit.y, 33, 67) },
    };
}

/** The custom properties the vendored CSS reads, from a pose. */
export function cssVars(p: Pose): Record<string, string> {
    const fromCenter = clamp(Math.sqrt((p.glare.y - 50) ** 2 + (p.glare.x - 50) ** 2) / 50, 0, 1);
    return {
        "--pointer-x": `${p.glare.x}%`,
        "--pointer-y": `${p.glare.y}%`,
        "--pointer-from-center": `${fromCenter}`,
        "--pointer-from-top": `${p.glare.y / 100}`,
        "--pointer-from-left": `${p.glare.x / 100}`,
        "--card-opacity": `${p.glare.o}`,
        "--rotate-x": `${p.rotate.x}deg`,
        "--rotate-y": `${p.rotate.y}deg`,
        "--background-x": `${p.background.x}%`,
        "--background-y": `${p.background.y}%`,
    };
}
