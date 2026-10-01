"use client";

import { useEffect, useRef, useState } from "react";
import { FILM_BAND_FRAGMENT } from "@/lib/film-band";
import { ORB_GLASS_VERTEX } from "@/lib/orb-glass";
import { cx } from "@/utils/cx";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** The film is soft all over, so it is drawn at half the band's CSS pixels and the browser scales it up: a quarter of the work for nothing seen. */
const SCALE = 0.5;

/** The page's colour as the shader takes it, in sRGB 0 to 1: whatever form the token computes to, a canvas reads it back as pixels. */
function pageColour(element: Element): [number, number, number] | null {
    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!probe) return null;
    probe.fillStyle = getComputedStyle(element).backgroundColor;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
}

function webgl2(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    try {
        return canvas.getContext("webgl2", { antialias: false, alpha: false });
    } catch {
        return null;
    }
}

type FilmBandProps = { className?: string };

// The mark's soap film laid flat as a header (the shader is `film-band.ts`). It flows slowly; it
// stands still under reduced motion, out of view, in a hidden tab and on a machine with no GPU,
// where WebGL runs on the CPU and a frame loop would hold the page up (orb-glass.tsx found that
// in CI). Before script, and where WebGL2 is missing, a soft gradient of the same colours from the
// theme's tokens stands in; the drawing fades in over it. Decoration: a screen reader skips it.
export function FilmBand({ className }: FilmBandProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [drawn, setDrawn] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ground = canvas?.parentElement;
        const gl = canvas ? webgl2(canvas) : null;
        if (!canvas || !ground || !gl) return;

        const program = gl.createProgram();
        for (const [type, source] of [
            [gl.VERTEX_SHADER, ORB_GLASS_VERTEX],
            [gl.FRAGMENT_SHADER, FILM_BAND_FRAGMENT],
        ] as const) {
            const shader = gl.createShader(type);
            if (!shader) return;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            // A shader that will not compile leaves the gradient, which is the band without script.
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return;
            gl.attachShader(program, shader);
        }
        gl.linkProgram(program);
        gl.useProgram(program);
        const u = Object.fromEntries(["uRes", "uTime", "uDark", "uPage"].map((name) => [name, gl.getUniformLocation(program, name)]));

        const debug = gl.getExtension("WEBGL_debug_renderer_info");
        const hardware = !/swiftshader|llvmpipe|software/i.test(debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "");
        const media = matchMedia(REDUCED_MOTION);
        let moving = hardware && !media.matches;
        let inView = false;
        let frame = 0;
        let last: number | null = null;
        let clock = 0;
        let shown = false;
        let dark = false;
        let page: [number, number, number] = [1, 1, 1];
        const readTheme = () => {
            dark = document.documentElement.classList.contains("dark-mode");
            page = pageColour(ground) ?? (dark ? [0.05, 0.05, 0.06] : [1, 1, 1]);
        };
        readTheme();

        const draw = (now: number) => {
            frame = 0;
            // A pause of any length counts as one short frame, so the film never jumps.
            const step = last === null ? 0 : Math.min((now - last) / 1000, 1 / 30);
            last = now;
            if (moving) clock += step;
            const width = Math.max(1, Math.round(canvas.clientWidth * SCALE));
            const height = Math.max(1, Math.round(canvas.clientHeight * SCALE));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            gl.viewport(0, 0, width, height);
            gl.uniform2f(u.uRes, width, height);
            gl.uniform1f(u.uTime, clock);
            gl.uniform1f(u.uDark, dark ? 1 : 0);
            gl.uniform3f(u.uPage, page[0], page[1], page[2]);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (!shown) {
                shown = true;
                setDrawn(true);
            }
            if (moving && inView && !document.hidden) frame = requestAnimationFrame(draw);
        };
        const schedule = () => {
            if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
        };
        const stop = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            last = null;
        };

        const sight = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView) schedule();
            else stop();
        });
        sight.observe(canvas);
        const size = new ResizeObserver(() => schedule());
        size.observe(canvas);
        // A theme switch repaints in the other theme's colours, moving or not.
        const theme = new MutationObserver(() => {
            readTheme();
            schedule();
        });
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        const onMotion = () => {
            moving = hardware && !media.matches;
            schedule();
        };
        media.addEventListener("change", onMotion);
        const onVisibility = () => (document.hidden ? stop() : schedule());
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            stop();
            sight.disconnect();
            size.disconnect();
            theme.disconnect();
            media.removeEventListener("change", onMotion);
            document.removeEventListener("visibilitychange", onVisibility);
            // The context is not lost on purpose here: React runs this effect twice in development on
            // the same canvas, and a context lost in the first cleanup is the one the second run gets.
        };
    }, []);

    return (
        // The page's colour under all of it: the shader reads it back from here to lay the film over.
        <div aria-hidden className={cx("relative overflow-hidden bg-page", className)}>
            {/* The stand-in: the palest tones on light and the deepest on dark, so it never outshouts the film. */}
            <div className="absolute inset-0 bg-linear-to-br from-utility-blue-50 via-utility-purple-50 to-utility-pink-50" />
            <canvas
                ref={canvasRef}
                className={cx("absolute inset-0 size-full transition-opacity duration-(--duration-draw)", drawn ? "opacity-100" : "opacity-0")}
            />
        </div>
    );
}
