/*
 * The Card Orb orb: a sash of dotted bands wrapped round a faint sphere, rippling as it goes. One
 * frame is a list of dots; the animated canvas on the landing page and the still SVG a logo or an
 * app icon needs both draw that same list, so the mark is one drawing.
 *
 * The geometry is the "composing" orb from thinking-orbs 0.3.1 by Jakub Antalik, read out of its
 * build and rewritten with names. The package ships two sizes (20 and 64 px); this one draws at any
 * size, tuning its dot count and dot size from the size asked for (at 64 px it is the package's
 * own), and paints in one colour with an opacity per dot, so it takes the text colour of wherever
 * it stands instead of picking a theme.
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

/** The moment a still orb shows. */
export const ORB_STILL_TIME = 0.6;

/** Bands side by side in the sash: the package's 64 px preset, kept at every size so the sash keeps its width. */
const BANDS = 12;

/** How a size tunes the drawing. Exported for the test; everything else asks `orbFrame`. */
export function orbTuning(size: number) {
    // Fewer dots on a smaller orb, so they stay apart; from 300 px up, the original's count.
    // At 64 px this lands on the package's 64 px preset: 44 dots round each band, 38 in the sphere.
    const count = Math.min(1, (size / DESIGN_SIZE) ** 0.897);
    const around = Math.max(16, Math.round(88 * Math.sqrt(count)));
    const sphere = Math.max(12, Math.round(150 * count));
    // Dots a little finer as the orb shrinks (0.85 at 64 px), so the bands stay apart.
    const thin = 1 - 0.15 * Math.min(1, Math.max(0, (DESIGN_SIZE - size) / (DESIGN_SIZE - 64)));
    return { around, sphere, thin };
}

/** A point on a unit sphere, spread evenly: the i-th of n on a golden-angle spiral. */
function spherePoint(index: number, total: number): [number, number, number] {
    const y = 1 - (2 * (index + 0.5)) / total;
    const across = Math.sqrt(1 - y * y);
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    return [across * Math.cos(angle), y, across * Math.sin(angle)];
}

/**
 * The dots of the orb at `size` px, `time` seconds of its own clock in. `sashTilt` is how far the
 * sash leans back from facing you, in radians; the moving orb keeps the original's.
 */
export function orbFrame(size: number, time: number, sashTilt = 0.55): OrbDot[] {
    const { around, sphere, thin } = orbTuning(size);
    const centre = size / 2;
    const radius = (size / 2) * 0.78;
    const dotScale = (size / DESIGN_SIZE) ** 0.6;

    // The camera looks down on the orb a little; the sash is tilted further, and holds still while it ripples.
    const [sinView, cosView] = [Math.sin(0.3), Math.cos(0.3)];
    const [sinSash, cosSash] = [Math.sin(sashTilt), Math.cos(sashTilt)];
    const view = (x: number, y: number, z: number) => ({
        x: centre + x,
        y: centre - (y * cosView - z * sinView),
        z: y * sinView + z * cosView,
    });

    // The original paints grey on white; a grey g is the ink at opacity 1 - g, on either ground.
    const dots: (OrbDot & { z: number })[] = [];
    const add = (x: number, y: number, z: number, r: number, grey: number, alpha: number) => {
        const opacity = alpha * (1 - grey);
        if (opacity >= 0.02) dots.push({ x, y, z, r: Math.max(0.3, r), opacity });
    };

    // The faint sphere behind the sash.
    for (let index = 0; index < sphere; index++) {
        const [px, py, pz] = spherePoint(index, sphere);
        const point = view(px * radius, py * radius, pz * radius);
        add(point.x, point.y, point.z, 0.8 * dotScale, 0.78, 0.1 + 0.22 * ((point.z / radius + 1) / 2));
    }

    for (let band = 0; band < BANDS; band++) {
        const fromMiddle = band - (BANDS - 1) / 2;
        const offset = fromMiddle * 0.075;
        const edge = Math.abs(fromMiddle) / ((BANDS - 1) / 2);

        for (let step = 0; step < around; step++) {
            const angle = (step / around) * 2 * Math.PI;
            // Two waves running round the band at different speeds push it off its line.
            const ripple = 0.16 * Math.sin(angle * 3 - time * 1.7 + band * 0.22) + 0.07 * Math.sin(angle * 5 + time * 1.1);
            const lift = offset + ripple;

            // A tilted circle, pushed along its axis by the lift, then put back on the sphere.
            const x = Math.cos(angle);
            const y = cosSash * Math.sin(angle) - sinSash * lift;
            const z = sinSash * Math.sin(angle) + cosSash * lift;
            const length = Math.sqrt(x * x + y * y + z * z);
            const point = view((x / length) * radius, (y / length) * radius, (z / length) * radius);

            const near = (point.z / radius + 1) / 2;
            const r = (1.1 * thin + 1.7 * thin * near) * (1 - 0.25 * edge) * dotScale;
            add(point.x, point.y, point.z, r, 0.52 - 0.44 * near + 0.18 * edge, 0.4 + 0.6 * near);
        }
    }

    return dots.sort((a, b) => a.z - b.z).map(({ x, y, r, opacity }) => ({ x, y, r, opacity }));
}

/** The logo's circle behind its dots, in pixels of a `size` square. */
export type OrbLogo = { circle: { cx: number; cy: number; r: number; opacity: number }; dots: OrbDot[] };

/** The size the logo is drawn at before it is scaled: the landing page's orb, so the two are one drawing. */
const LOGO_DRAWN_AT = 220;

/**
 * The orb as a logo, for the wordmark, the sidebar, the favicon and the app icon. The landing
 * page's drawing at one moment, with three changes so it holds up small and standing still:
 * - the sash leans back less (0.2 rather than 0.55), so its full side folds over the top edge;
 * - a faint circle and a faint half sphere of dots fill the outline, so it reads perfectly round;
 * - it fills more of its square, and its dots grow as it shrinks (1.8 times at 28 px, as drawn
 *   from 110 px up), so a small logo stays a shape instead of a grey smudge.
 * The owner's picks, compared side by side (#626).
 */
export function orbLogo(size: number): OrbLogo {
    const drawn = LOGO_DRAWN_AT;
    const centre = drawn / 2;
    const radius = centre * 0.78;
    const scale = (size / drawn) * 1.12;
    const shift = (size - drawn * scale) / 2;
    const weight = 1 + 0.8 * Math.min(1, Math.max(0, (110 - size) / 82));

    const place = (dot: OrbDot): OrbDot => ({ x: dot.x * scale + shift, y: dot.y * scale + shift, r: dot.r * scale * weight, opacity: dot.opacity });

    // The front half of an even sphere of dots, under the sash, fainter toward the edge.
    const sphere: OrbDot[] = [];
    const total = 900;
    const [sinView, cosView] = [Math.sin(0.3), Math.cos(0.3)];
    for (let index = 0; index < total; index++) {
        const [x, y, z] = spherePoint(index, total);
        const facing = y * sinView + z * cosView;
        if (facing < 0) continue;
        sphere.push({ x: centre + x * radius, y: centre - (y * cosView - z * sinView) * radius, r: 1, opacity: 0.2 * (0.55 + 0.45 * facing) });
    }

    return {
        circle: { cx: size / 2, cy: size / 2, r: radius * scale, opacity: 0.05 },
        dots: [...sphere, ...orbFrame(drawn, ORB_STILL_TIME, 0.2)].map(place),
    };
}

/** The sizes the logo is drawn for; anything else is shown from the nearest one at or above it. */
export const ORB_LOGO_SIZES = [16, 28, 64, 128] as const;

/** The logo file drawn for showing it at `size` px. */
export function orbLogoSizeFor(size: number): (typeof ORB_LOGO_SIZES)[number] {
    return ORB_LOGO_SIZES.find((drawn) => drawn >= size) ?? ORB_LOGO_SIZES[ORB_LOGO_SIZES.length - 1];
}

/** The logo as an SVG document in one colour: the file the page masks with, and the icons' picture. */
export function orbLogoSvg(size: number, color: string): string {
    const { circle, dots } = orbLogo(size);
    const round = (value: number) => Math.round(value * 100) / 100;
    const circles = [
        `<circle cx="${round(circle.cx)}" cy="${round(circle.cy)}" r="${round(circle.r)}" fill-opacity="${circle.opacity}"/>`,
        ...dots.map((dot) => `<circle cx="${round(dot.x)}" cy="${round(dot.y)}" r="${round(dot.r)}" fill-opacity="${round(dot.opacity)}"/>`),
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="${color}">${circles.join("")}</svg>`;
}
