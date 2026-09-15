"use client";

import { useEffect, useRef, useState } from "react";
import { ORB_STILL_TIME, orbFrame } from "@/lib/orb";
import { OrbMark } from "./orb-mark";

type OrbProps = {
    /** Width and height in px. */
    size: number;
    /** A multiplier on the orb's clock; 1 is a calm pace, a quarter of the loading indicator it comes from. */
    speed?: number;
    className?: string;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// The orb turning. The server sends the still OrbMark, so the page never waits on script for it;
// once mounted a canvas takes over from that same moment, unless the visitor asked for less motion.
// It stops drawing while scrolled out of view or while the tab is hidden, and picks up where it was.
export function Orb({ size, speed = 1, className, label }: OrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        const media = matchMedia(REDUCED_MOTION);
        const update = () => setMoving(!media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!moving || !canvas || !context) return;

        const scale = Math.min(2, devicePixelRatio || 1);
        canvas.width = Math.round(size * scale);
        canvas.height = Math.round(size * scale);

        // Its own clock, which runs only while drawn, so it starts on the still frame and a pause loses nothing.
        let clock = ORB_STILL_TIME;
        let last: number | null = null;
        let frame = 0;
        let inView = true;

        const draw = (now: number) => {
            if (last !== null) clock += ((now - last) / 1000) * speed * 0.5;
            last = now;
            // The text colour, read each frame, so a theme switch repaints without being told.
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.clearRect(0, 0, size, size);
            context.fillStyle = getComputedStyle(canvas).color;
            for (const dot of orbFrame(size, clock)) {
                context.globalAlpha = dot.opacity;
                context.beginPath();
                context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
                context.fill();
            }
            frame = requestAnimationFrame(draw);
        };
        const start = () => {
            if (frame || !inView || document.hidden) return;
            last = null;
            frame = requestAnimationFrame(draw);
        };
        const stop = () => {
            cancelAnimationFrame(frame);
            frame = 0;
        };
        const onVisibility = () => (document.hidden ? stop() : start());

        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView) start();
            else stop();
        });
        observer.observe(canvas);
        document.addEventListener("visibilitychange", onVisibility);
        start();

        return () => {
            stop();
            observer.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [moving, size, speed]);

    const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

    return moving ? (
        <canvas ref={canvasRef} className={className} style={{ width: size, height: size }} {...a11y} />
    ) : (
        <OrbMark size={size} className={className} label={label} />
    );
}
