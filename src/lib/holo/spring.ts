/**
 * A spring over a few numbers, stepped once a frame.
 *
 * The same integrator as Svelte's `spring` (semi-implicit Euler, with time counted in sixtieths
 * of a second), so the source effect's stiffness and damping keep their feel: 0.066 / 0.25 while
 * the pointer drives the card, 0.01 / 0.06 with a one-second soft start when it lets go. Velocity
 * is read from the last two positions, so the numbers can change mid-flight without a jump.
 */

export type SpringParams = { stiffness: number; damping: number };

export class Spring<K extends string> {
    value: Record<K, number>;
    target: Record<K, number>;
    stiffness: number;
    damping: number;
    private last: Record<K, number>;
    private invMass = 1;
    private invMassRecovery = 0;
    private readonly keys: K[];
    private readonly precision: number;

    constructor(initial: Record<K, number>, params: SpringParams, precision = 0.01) {
        this.value = { ...initial };
        this.last = { ...initial };
        this.target = { ...initial };
        this.stiffness = params.stiffness;
        this.damping = params.damping;
        this.precision = precision;
        this.keys = Object.keys(initial) as K[];
    }

    /** A new target. `soft` (seconds) starts the move weightless and lets its mass back over that time. */
    set(target: Record<K, number>, opts: { soft?: number } = {}): void {
        this.target = { ...target };
        if (opts.soft) {
            this.invMass = 0;
            this.invMassRecovery = 1 / (opts.soft * 60);
        }
    }

    setParams({ stiffness, damping }: SpringParams): void {
        this.stiffness = stiffness;
        this.damping = damping;
    }

    /** Straight to a value, no motion. */
    reset(target: Record<K, number>): void {
        this.value = { ...target };
        this.last = { ...target };
        this.target = { ...target };
        this.invMass = 1;
        this.invMassRecovery = 0;
    }

    /** Advances by the elapsed time; true when at rest on the target. */
    step(elapsedMs: number): boolean {
        // A frame that took long (a tab in the background) counts as two frames at most, or the
        // step would overshoot into nonsense.
        const dt = Math.min(Math.max(elapsedMs, 0) * 0.06, 2) || 1 / 60;
        this.invMass = Math.min(this.invMass + this.invMassRecovery, 1);
        let settled = true;
        for (const k of this.keys) {
            const delta = this.target[k] - this.value[k];
            const velocity = (this.value[k] - this.last[k]) / dt;
            const acceleration = (this.stiffness * delta - this.damping * velocity) * this.invMass;
            const d = (velocity + acceleration) * dt;
            this.last[k] = this.value[k];
            if (Math.abs(d) < this.precision && Math.abs(delta) < this.precision) {
                this.value[k] = this.target[k];
            } else {
                this.value[k] += d;
                settled = false;
            }
        }
        return settled;
    }
}
