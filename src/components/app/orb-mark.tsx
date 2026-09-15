import { ORB_STILL_TIME, orbFrame } from "@/lib/orb";

type OrbMarkProps = {
    /** Width and height in px; the dot count is tuned for it, so ask for the size it is shown at. */
    size: number;
    /** The moment drawn, in seconds of the orb's clock. */
    time?: number;
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

// The orb standing still, as an SVG in the text colour: the mark for a logo or an app icon, and
// what the moving Orb shows until its canvas takes over. No hooks, so a server component can draw it.
export function OrbMark({ size, time = ORB_STILL_TIME, className, label }: OrbMarkProps) {
    const dots = orbFrame(size, time);
    const round = (value: number) => Math.round(value * 100) / 100;

    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            fill="currentColor"
            className={className}
            {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        >
            {dots.map((dot, index) => (
                <circle key={index} cx={round(dot.x)} cy={round(dot.y)} r={round(dot.r)} fillOpacity={round(dot.opacity)} />
            ))}
        </svg>
    );
}
