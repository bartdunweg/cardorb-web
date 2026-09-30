"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import {
    ORB_GLASS_FILL,
    ORB_GLASS_FLOOR,
    ORB_GLASS_FLOWS,
    ORB_GLASS_FRAGMENT,
    ORB_GLASS_MATERIAL_INDEX,
    ORB_GLASS_VERTEX,
    type OrbGlassMaterial,
    orbGlassFamily,
    orbGlassIsScene,
    orbGlassTilt,
} from "@/lib/orb-glass";
import { cx } from "@/utils/cx";

type OrbGlassProps = {
    /** Width and height in px. */
    size: number;
    material: OrbGlassMaterial;
    /** What the orb sits on, which it mirrors in its lower half; the page's own theme by default. */
    surface?: "light" | "dark";
    /** For a scene material: the mark, the scene with no tile, on the page. */
    mark?: boolean;
    /** For the mark: without it, no shadow and no glow round the ball. */
    shadow?: boolean;
    className?: string;
    style?: CSSProperties;
    /** A name makes it an image; without one it is decoration and a screen reader skips it. */
    label?: string;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const TILT_REACH = 520;

type Instance = {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    size: number;
    material: OrbGlassMaterial;
    surface?: "light" | "dark";
    mark: boolean;
    shadow: boolean;
    inView: boolean;
    tilt: [number, number];
    goal: [number, number];
};

/**
 * One GPU canvas for every orb on the page, since a browser allows a handful of WebGL contexts
 * and a design page shows dozens. Each frame it draws each visible orb in turn, at twice its
 * pixel size, and copies the result into that orb's own 2D canvas. One clock and one pointer
 * for all of them, so every orb on the page turns to the same light.
 */
class Studio {
    private readonly gl: WebGL2RenderingContext;
    private readonly canvas: HTMLCanvasElement;
    private readonly uniforms: Record<string, WebGLUniformLocation | null>;
    private readonly instances = new Set<Instance>();
    private frame = 0;
    private last: number | null = null;
    private clock = 0;
    private pointer: [number, number] | null = null;
    private moving = true;

    private constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
        this.gl = gl;
        this.canvas = canvas;
        const program = gl.createProgram();
        for (const [type, source] of [
            [gl.VERTEX_SHADER, ORB_GLASS_VERTEX],
            [gl.FRAGMENT_SHADER, ORB_GLASS_FRAGMENT],
        ] as const) {
            const shader = gl.createShader(type);
            if (!shader) throw new Error("orb-glass: no shader");
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`orb-glass: ${gl.getShaderInfoLog(shader) ?? "shader"}`);
            gl.attachShader(program, shader);
        }
        gl.linkProgram(program);
        gl.useProgram(program);
        this.uniforms = Object.fromEntries(
            ["uRes", "uMat", "uFloor", "uFloorMix", "uTilt", "uTime", "uFill", "uDark", "uScene", "uShadow"].map((name) => [
                name,
                gl.getUniformLocation(program, name),
            ]),
        );
        window.addEventListener("pointermove", this.onPointer, { passive: true });
        document.addEventListener("visibilitychange", this.onVisibility);
        const media = matchMedia(REDUCED_MOTION);
        const update = () => {
            this.moving = !media.matches;
            this.pointer = null;
            this.schedule();
        };
        update();
        media.addEventListener("change", update);
    }

    private static shared: Studio | null | undefined;

    /** The page's one studio, or null where the browser has no WebGL2. */
    static get(): Studio | null {
        if (Studio.shared !== undefined) return Studio.shared;
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
            Studio.shared = gl ? new Studio(gl, canvas) : null;
        } catch {
            Studio.shared = null;
        }
        return Studio.shared;
    }

    add(instance: Instance) {
        this.instances.add(instance);
        this.schedule();
    }

    remove(instance: Instance) {
        this.instances.delete(instance);
    }

    /** Draw again, now: for an orb that just came into view or changed size. */
    schedule() {
        if (this.frame || document.hidden) return;
        this.frame = requestAnimationFrame(this.draw);
    }

    private readonly onPointer = (event: PointerEvent) => {
        if (!this.moving) return;
        this.pointer = [event.clientX, event.clientY];
        this.schedule();
    };

    private readonly onVisibility = () => {
        if (document.hidden) {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
        } else this.schedule();
    };

    private readonly draw = (now: number) => {
        this.frame = 0;
        // A pause of any length counts as one short frame, so the film never jumps and the lights never snap.
        const step = this.last === null ? 1 / 60 : Math.min((now - this.last) / 1000, 1 / 30);
        this.last = now;
        if (this.moving) this.clock += step;
        const dark = document.documentElement.classList.contains("dark-mode");
        let settling = false;

        for (const it of this.instances) {
            if (!it.inView) continue;
            if (this.pointer) {
                const rect = it.canvas.getBoundingClientRect();
                it.goal = orbGlassTilt(this.pointer[0], this.pointer[1], rect.left + rect.width / 2, rect.top + rect.height / 2, TILT_REACH);
            }
            // The lights ease over, never snap.
            const ease = 1 - Math.exp(-step * 6);
            it.tilt = [it.tilt[0] + (it.goal[0] - it.tilt[0]) * ease, it.tilt[1] + (it.goal[1] - it.tilt[1]) * ease];
            if (Math.abs(it.goal[0] - it.tilt[0]) + Math.abs(it.goal[1] - it.tilt[1]) > 0.002) settling = true;
            this.paint(it, (it.surface ?? (dark ? "dark" : "light")) === "dark");
        }

        // A film flows on its own; glass only moves when the lights do.
        const flowing = this.moving && [...this.instances].some((it) => it.inView && ORB_GLASS_FLOWS[orbGlassFamily(it.material)]);
        if ((flowing || settling) && !document.hidden) this.frame = requestAnimationFrame(this.draw);
    };

    private paint(it: Instance, dark: boolean) {
        const { gl, canvas, uniforms: u } = this;
        const scale = Math.min(2, devicePixelRatio || 1);
        const px = Math.round(it.size * scale);
        if (it.canvas.width !== px) it.canvas.width = it.canvas.height = px;
        // Drawn at twice the pixels and halved on the copy: four samples per pixel on top of the shader's own four.
        const gpx = Math.max(64, px * 2);
        if (canvas.width !== gpx) canvas.width = canvas.height = gpx;
        gl.viewport(0, 0, gpx, gpx);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const floor = ORB_GLASS_FLOOR[dark ? "dark" : "light"];
        gl.uniform2f(u.uRes, gpx, gpx);
        gl.uniform1i(u.uMat, ORB_GLASS_MATERIAL_INDEX[it.material]);
        gl.uniform3f(u.uFloor, floor[0], floor[1], floor[2]);
        gl.uniform1f(u.uFloorMix, 0.75);
        gl.uniform2f(u.uTilt, it.tilt[0], it.tilt[1]);
        gl.uniform1f(u.uTime, this.clock);
        gl.uniform1f(u.uFill, ORB_GLASS_FILL);
        gl.uniform1f(u.uDark, dark ? 1 : 0);
        gl.uniform1f(u.uScene, orbGlassIsScene(it.material) ? (it.mark ? 2 : 1) : 0);
        gl.uniform1f(u.uShadow, it.shadow ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        it.context.imageSmoothingQuality = "high";
        it.context.clearRect(0, 0, px, px);
        it.context.drawImage(canvas, 0, 0, px, px);
    }
}

// A glass orb, live. The GPU draws it (one shared context, see Studio), the lights lean toward the
// pointer, and a bubble's film flows; both stop under reduced motion, out of view and in a hidden
// tab. Where there is no WebGL2 the canvas stays blank and, if it has a name, still says it.
export function OrbGlass({ size, material, surface, mark = false, shadow = true, className, style, label }: OrbGlassProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        const studio = Studio.get();
        if (!canvas || !context || !studio) return;
        const instance: Instance = { canvas, context, size, material, surface, mark, shadow, inView: false, tilt: [0, 0], goal: [0, 0] };
        const observer = new IntersectionObserver(([entry]) => {
            instance.inView = entry.isIntersecting;
            if (instance.inView) studio.schedule();
        });
        observer.observe(canvas);
        studio.add(instance);
        return () => {
            observer.disconnect();
            studio.remove(instance);
        };
    }, [size, material, surface, mark, shadow]);

    const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

    return <canvas ref={canvasRef} className={cx("block shrink-0", className)} style={{ ...style, width: size, height: size }} {...a11y} />;
}
