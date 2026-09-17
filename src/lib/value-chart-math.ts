/**
 * The arithmetic behind the value chart, kept apart from the drawing so a test can hold it still.
 * Nothing here knows about React or the DOM.
 */

export type Point = { x: number; y: number; index: number };

export type Frame = { width: number; height: number; top: number; right: number; bottom: number; left: number };

/**
 * The range the line is drawn over: exactly its lowest reading to its highest, so a week that rose
 * starts at the bottom and ends at the top however little it moved (Bart, 2026-09-15: Home's 7 days
 * read as a flat line). The figures at the chart's top left and bottom left say how much that is. A
 * flat line gets a hair either side and sits in the middle.
 */
export function fullRange(min: number, max: number): [number, number] {
    if (max > min) return [min, max];
    const hair = Math.abs(max) * 0.01 || 1;
    return [min - hair, max + hair];
}

/**
 * Where each reading lands inside the frame; y is linear between the axis ends.
 *
 * x by time when the readings' days are given, evenly otherwise. Evenly spaced, a stretch with no
 * readings took one step like any week, so a gap of two months drew as narrow as a week (Bart,
 * 2026-09-14: a missing stretch has to show). By time, the gap is as wide as it lasted.
 */
export function pointsFor(values: number[], frame: Frame, yMin: number, yMax: number, days?: string[]): Point[] {
    const innerWidth = frame.width - frame.left - frame.right;
    const innerHeight = frame.height - frame.top - frame.bottom;
    const span = yMax - yMin;
    const n = values.length;
    const times = days && days.length === n ? days.map((d) => Date.parse(`${d}T00:00:00Z`)) : null;
    const t0 = times ? times[0] : 0;
    const tSpan = times ? times[n - 1] - t0 : 0;
    return values.map((v, index) => ({
        index,
        x: frame.left + (n === 1 ? innerWidth / 2 : times && tSpan > 0 ? ((times[index] - t0) / tSpan) * innerWidth : (index / (n - 1)) * innerWidth),
        y: frame.top + innerHeight - (span > 0 ? ((v - yMin) / span) * innerHeight : 0),
    }));
}

/**
 * Which readings the line is drawn through: the readings themselves, never an average of them.
 *
 * Up to `target` readings are all drawn. Past that (a long period, a narrow phone), the stretch
 * between the first and the last reading is cut into equal spans of time, and each span keeps its
 * lowest and its highest reading, in the order they came. The first and the last are always kept,
 * so a real dip or peak is never erased and the line only passes through values that were read.
 *
 * The line used to be softened (each point a quarter of each neighbour and half itself, after
 * averaging per span). That drew a rise on days the value fell: 40,182 then 40,153 went up on the
 * line while the tooltip said down (Bart, 2026-09-17). The curve itself (linePath) stays smooth and
 * cannot overshoot, so the readings need no softening of their own.
 *
 * Returns the kept readings' indices, ascending.
 */
export function thinReadings(times: number[], values: number[], target: number): number[] {
    const n = values.length;
    const all = values.map((_, i) => i);
    if (n <= Math.max(2, target)) return all;
    const spans = Math.max(1, Math.floor((target - 2) / 2));
    const t0 = times[0];
    const width = (times[n - 1] - t0) / spans;
    const keep = new Set([0, n - 1]);
    const low = new Array<number>(spans).fill(-1);
    const high = new Array<number>(spans).fill(-1);
    for (let i = 1; i < n - 1; i++) {
        const k = width > 0 ? Math.min(spans - 1, Math.max(0, Math.floor((times[i] - t0) / width))) : Math.floor(((i - 1) / (n - 2)) * spans);
        if (low[k] < 0 || values[i] < values[low[k]]) low[k] = i;
        if (high[k] < 0 || values[i] > values[high[k]]) high[k] = i;
    }
    for (let k = 0; k < spans; k++) {
        if (low[k] >= 0) keep.add(low[k]);
        if (high[k] >= 0) keep.add(high[k]);
    }
    return [...keep].sort((x, y) => x - y);
}

/**
 * An SVG path through the points as a smooth line. Monotone cubic (Fritsch–Carlson) rather
 * than a Catmull-Rom: the curve never overshoots a reading, so a peak is the reading and not
 * a bulge past it. Two points are a straight segment.
 */
export function linePath(points: Point[]): string {
    const n = points.length;
    if (n === 0) return "";
    const f = (v: number) => v.toFixed(1);
    if (n < 3) return points.map((p, i) => `${i === 0 ? "M" : "L"}${f(p.x)} ${f(p.y)}`).join(" ");
    // Secant slopes, then a tangent per point that keeps the curve monotone between readings.
    const dx = Array.from({ length: n - 1 }, (_, i) => points[i + 1].x - points[i].x || 1e-6);
    const m = Array.from({ length: n - 1 }, (_, i) => (points[i + 1].y - points[i].y) / dx[i]);
    const t = new Array<number>(n).fill(0);
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
        if (m[i] === 0) {
            t[i] = 0;
            t[i + 1] = 0;
            continue;
        }
        const a = t[i] / m[i];
        const b = t[i + 1] / m[i];
        const h = Math.hypot(a, b);
        if (h > 3) {
            t[i] = ((3 * a) / h) * m[i];
            t[i + 1] = ((3 * b) / h) * m[i];
        }
    }
    let d = `M${f(points[0].x)} ${f(points[0].y)}`;
    for (let i = 0; i < n - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const h = dx[i] / 3;
        d += ` C${f(p0.x + h)} ${f(p0.y + t[i] * h)} ${f(p1.x - h)} ${f(p1.y - t[i + 1] * h)} ${f(p1.x)} ${f(p1.y)}`;
    }
    return d;
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
