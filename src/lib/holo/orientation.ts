/**
 * The phone's tilt as a source for the card, and the permission iOS asks for it.
 *
 * Android and desktop browsers hand out `deviceorientation` without asking; iOS 13 and later
 * asks once, and only inside a tap. The answer is kept for the page's life, so one tap on a
 * Tilt button serves every sheet after it.
 */

type Asking = { requestPermission?: () => Promise<"granted" | "denied"> };

let granted = false;

/** Whether this browser wants a tap before it reports the tilt. */
export function orientationNeedsPermission(): boolean {
    return (
        typeof window !== "undefined" &&
        "DeviceOrientationEvent" in window &&
        typeof (DeviceOrientationEvent as unknown as Asking).requestPermission === "function"
    );
}

/** Whether the tilt may be read now: no permission needed, or granted earlier. */
export function orientationAllowed(): boolean {
    return typeof window !== "undefined" && "DeviceOrientationEvent" in window && (!orientationNeedsPermission() || granted);
}

/** Asks, from inside a tap; true when the phone may be read from now on. */
export async function requestOrientation(): Promise<boolean> {
    if (!orientationNeedsPermission()) return "DeviceOrientationEvent" in window;
    try {
        granted = (await (DeviceOrientationEvent as unknown as Required<Asking>).requestPermission()) === "granted";
    } catch {
        granted = false;
    }
    return granted;
}
