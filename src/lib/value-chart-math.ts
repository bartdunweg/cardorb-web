/**
 * The arithmetic behind the value chart, kept apart from the drawing so a test can hold it still.
 * Nothing here knows about React or the DOM.
 */

export type Point = { x: number; y: number; index: number };

export type Frame = { width: number; height: number; top: number; right: number; bottom: number; left: number };

/**
 * Round tick values spanning the readings: a "nice" step (1, 2, 2.5, 5 × 10ⁿ) from the last round
 * number below the lowest reading to the first above the highest. Not from zero: a collection worth
 * €880 one night and €1,000 three weeks later has moved by an eighth, and on an axis that starts
 * at zero that movement is a flat line. The axis labels say where the floor is.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
    if (!(max > min)) return [Math.floor(min), Math.floor(min) + 1];
    const rough = (max - min) / count;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
    const floor = Math.floor(min / step) * step;
    const ticks: number[] = [];
    for (let v = floor; v < max; v += step) ticks.push(Math.round(v * 1000) / 1000);
    ticks.push(Math.round((ticks[ticks.length - 1] + step) * 1000) / 1000);
    return ticks;
}

/** Where each reading lands inside the frame; x spreads readings evenly, y is linear between the axis ends. */
export function pointsFor(values: number[], frame: Frame, yMin: number, yMax: number): Point[] {
    const innerWidth = frame.width - frame.left - frame.right;
    const innerHeight = frame.height - frame.top - frame.bottom;
    const span = yMax - yMin;
    const n = values.length;
    return values.map((v, index) => ({
        index,
        x: frame.left + (n === 1 ? innerWidth / 2 : (index / (n - 1)) * innerWidth),
        y: frame.top + innerHeight - (span > 0 ? ((v - yMin) / span) * innerHeight : 0),
    }));
}

/** An SVG path through the points, straight segments: a reading a night is data, not a curve. */
export function linePath(points: Point[]): string {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

/** The same line closed down to the baseline, for the fill under it. */
export function areaPath(points: Point[], baseline: number): string {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath(points)} L${last.x.toFixed(1)} ${baseline.toFixed(1)} L${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

/** The reading nearest to a pointer x, for the hover layer. */
export function nearestIndex(points: Point[], x: number): number {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].x - x) < Math.abs(points[best].x - x)) best = i;
    return best;
}
