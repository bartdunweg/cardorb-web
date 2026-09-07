"use client";

import { type RefObject, useEffect } from "react";
import { orientationAllowed } from "./orientation";
import { type Pose, REST, STATIC_POSE, cssVars, poseFromOrientation, poseFromPointer } from "./pose";
import { Spring } from "./spring";

/**
 * Tilts the card under the pointer and moves its light, by writing the vendored effect's custom
 * properties on the card element once a frame. No React state: a frame is a style write, not a
 * render.
 *
 * A pointer over the surface drives three springs (tilt, light, foil offset) with the source
 * effect's stiffness; when it leaves, a beat later, a softer spring lets the card settle flat.
 * On a phone the gyroscope drives the same springs while nothing touches the card, once the
 * browser allows it (Android at once; iOS after the Tilt button's tap, see orientation.ts); a
 * finger over the card wins.
 *
 * Reduced motion: the card is drawn once, lit from the top left and flat, and nothing listens.
 */

const INTERACT = { stiffness: 0.066, damping: 0.25 };
const SNAP = { stiffness: 0.01, damping: 0.06 };
// Long enough for a pointer to skip across the shine layers, short enough that the settle reads as an answer.
const RELEASE_MS = 150;

export type HoloTiltOptions = {
    /** "auto" reads the phone's tilt where the browser allows it; "off" never does. */
    orientation?: "auto" | "off";
    /** Flip it when permission was just granted, so the hook attaches the sensor. */
    orientationGranted?: boolean;
};

export function useHoloTilt(card: RefObject<HTMLElement | null>, surface: RefObject<HTMLElement | null>, options: HoloTiltOptions = {}): void {
    const orientation = options.orientation ?? "auto";
    const orientationGranted = options.orientationGranted ?? false;

    useEffect(() => {
        const el = card.current;
        const target = surface.current;
        if (!el || !target) return;

        const write = (vars: Record<string, string>) => {
            for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
        };

        if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            write(cssVars(STATIC_POSE));
            return;
        }

        const rotate = new Spring(REST.rotate, INTERACT);
        const glare = new Spring(REST.glare, INTERACT);
        const background = new Spring(REST.background, INTERACT);

        let frame: number | null = null;
        let last = 0;
        let pending: Pose | null = null;
        let releaseTimer: ReturnType<typeof setTimeout> | null = null;
        let pointerOn = false;
        let base: { gamma: number; beta: number } | null = null;

        const stop = () => {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
        };
        const clearRelease = () => {
            if (releaseTimer !== null) clearTimeout(releaseTimer);
            releaseTimer = null;
        };

        const tick = (now: number) => {
            frame = null;
            const elapsed = last ? now - last : 1000 / 60;
            last = now;
            if (pending) {
                rotate.set(pending.rotate);
                glare.set(pending.glare);
                background.set(pending.background);
                pending = null;
            }
            // Each spring steps every frame; `&&` alone would leave the others behind once one moved.
            const settled = [rotate.step(elapsed), glare.step(elapsed), background.step(elapsed)].every(Boolean);
            write(cssVars({ rotate: rotate.value, glare: glare.value, background: background.value }));
            if (!settled) frame = requestAnimationFrame(tick);
            else last = 0;
        };
        const run = () => {
            if (frame === null) frame = requestAnimationFrame(tick);
        };

        const drive = (pose: Pose) => {
            [rotate, glare, background].forEach((s) => s.setParams(INTERACT));
            pending = pose;
            run();
        };
        const release = () => {
            [rotate, glare, background].forEach((s) => s.setParams(SNAP));
            pending = null;
            rotate.set(REST.rotate, { soft: 1 });
            glare.set(REST.glare, { soft: 1 });
            background.set(REST.background, { soft: 1 });
            run();
        };

        const onMove = (e: PointerEvent) => {
            pointerOn = true;
            clearRelease();
            drive(poseFromPointer(e.clientX, e.clientY, target.getBoundingClientRect()));
        };
        const onLeave = () => {
            pointerOn = false;
            clearRelease();
            releaseTimer = setTimeout(() => {
                releaseTimer = null;
                if (!pointerOn) release();
            }, RELEASE_MS);
        };
        const onUp = (e: PointerEvent) => {
            if (e.pointerType !== "touch") return;
            pointerOn = false;
            clearRelease();
            release();
        };
        target.addEventListener("pointerenter", onMove, { passive: true });
        target.addEventListener("pointermove", onMove, { passive: true });
        target.addEventListener("pointerleave", onLeave, { passive: true });
        target.addEventListener("pointercancel", onLeave, { passive: true });
        target.addEventListener("pointerup", onUp, { passive: true });

        // The first reading is the way the phone is held when the card opens: that is flat.
        const onOrientation = (e: DeviceOrientationEvent) => {
            if (e.gamma === null || e.beta === null) return;
            if (!base) base = { gamma: e.gamma, beta: e.beta };
            if (pointerOn) return;
            drive(poseFromOrientation(e.gamma - base.gamma, e.beta - base.beta));
        };
        const askless = orientation === "auto" && orientationAllowed();
        if (askless) window.addEventListener("deviceorientation", onOrientation, true);

        const onVisibility = () => {
            if (document.visibilityState !== "hidden") return;
            stop();
            clearRelease();
            pending = null;
            pointerOn = false;
            rotate.reset(REST.rotate);
            glare.reset(REST.glare);
            background.reset(REST.background);
            write(cssVars(REST));
            last = 0;
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            stop();
            clearRelease();
            target.removeEventListener("pointerenter", onMove);
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerleave", onLeave);
            target.removeEventListener("pointercancel", onLeave);
            target.removeEventListener("pointerup", onUp);
            if (askless) window.removeEventListener("deviceorientation", onOrientation, true);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [card, surface, orientation, orientationGranted]);
}
