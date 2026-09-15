/*
 * The Card Orb orb: a dotted globe, tilted toward you, turning, with a meridian of brighter dots
 * sweeping round it. One frame is a list of dots; the animated canvas on the landing page and the
 * still SVG a logo or an app icon needs both draw that same list, so the mark is one drawing.
 *
 * The geometry is the "searching" globe from thinking-orbs 0.3.1 by Jakub Antalik, read out of its
 * build and rewritten with names. The package ships two sizes (20 and 64 px); this one draws at any
 * size, tuning its dot count and dot size from the size asked for, and paints in one colour with an
 * opacity per dot, so it takes the text colour of wherever it stands instead of picking a theme.
 *
 * MIT License, Copyright (c) 2026 Jakub Antalik. Permission is hereby granted, free of charge, to
 * any person obtaining a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions: The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT
 * WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/** One dot, in pixels from the top left of a `size` square. Back to front. */
export type OrbDot = { x: number; y: number; r: number; opacity: number };

/** The size the original's unscaled numbers were drawn for. */
const DESIGN_SIZE = 300;

/** The moment a still orb shows: the meridian has come round to the front left. */
export const ORB_STILL_TIME = 0.6;

/** How a size tunes the drawing. Exported for the test; everything else asks `orbFrame`. */
export function orbTuning(size: number) {
    // Fewer dots on a smaller globe, so they stay apart; from 300 px up, the original's count.
    // At 64 px this lands on the package's own 64 px preset (11 rings, 29 dots round the equator).
    const count = Math.min(1, (size / DESIGN_SIZE) ** 0.56);
    const rings = Math.max(6, Math.round(17 * Math.sqrt(count)));
    const equator = Math.max(12, Math.round(44 * Math.sqrt(count)));
    // Dots a little fatter as the globe shrinks (1.15 at 64 px), so a small orb does not go grey.
    const fatten = 1 + 0.15 * Math.min(1, Math.max(0, (DESIGN_SIZE - size) / (DESIGN_SIZE - 64)));
    return { rings, equator, fatten };
}

/** The dots of the orb at `size` px, `time` seconds of its own clock in. */
export function orbFrame(size: number, time: number): OrbDot[] {
    const { rings, equator, fatten } = orbTuning(size);
    const centre = size / 2;
    const radius = (size / 2) * 0.82;
    const dotScale = (size / DESIGN_SIZE) ** 0.6;

    // It turns one way, nods a little, and the meridian runs round faster than the globe turns.
    const turn = time * 0.5;
    const tilt = 0.4 + 0.06 * Math.sin(time * 0.35);
    const meridian = time * (0.5 + 1.2 * 4.08);
    const [sinTurn, cosTurn, sinTilt, cosTilt] = [Math.sin(turn), Math.cos(turn), Math.sin(tilt), Math.cos(tilt)];

    const dots: (OrbDot & { z: number })[] = [];
    for (let ring = 0; ring <= rings; ring++) {
        const latitude = -Math.PI / 2 + (ring / rings) * Math.PI;
        const across = Math.cos(latitude);
        const up = Math.sin(latitude);
        const around = Math.max(1, Math.round(Math.abs(across) * equator));

        for (let step = 0; step < around; step++) {
            const longitude = (step / around) * 2 * Math.PI;
            const x0 = across * Math.cos(longitude);
            const z0 = across * Math.sin(longitude);

            // Turn about the vertical axis, then tilt the top toward you.
            const x = x0 * cosTurn + z0 * sinTurn;
            const zTurned = -x0 * sinTurn + z0 * cosTurn;
            const y = up * cosTilt - zTurned * sinTilt;
            const z = up * sinTilt + zTurned * cosTilt;

            const near = (z + 1) / 2;
            const fromMeridian = Math.atan2(Math.sin(longitude + turn - meridian), Math.cos(longitude + turn - meridian));
            const lit = Math.exp(-(fromMeridian * fromMeridian) / 0.18) * Math.max(0, z);

            // The original paints grey on white; a grey g is the ink at opacity 1 - g, on either ground.
            const ink = 1 - (0.62 - 0.54 * near);
            const opacity = ink * (0.45 + 0.55 * Math.min(1, lit));
            if (opacity < 0.02) continue;

            const r = (0.6 * fatten + 1.7 * fatten * near + lit) * dotScale;
            dots.push({ x: centre + x * radius, y: centre - y * radius, z, r: Math.max(0.3, r), opacity });
        }
    }

    return dots.sort((a, b) => a.z - b.z).map(({ x, y, r, opacity }) => ({ x, y, r, opacity }));
}
