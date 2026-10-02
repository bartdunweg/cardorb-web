/**
 * The film band: the mark's soap film laid flat, as a header. No ball, no studio: only the film's
 * own colour, flowing, over the page.
 *
 * The colour is v20's, to the line: `filmS`, `saturateS` and `noGreen` are copied verbatim from
 * `orb-glass.ts` (v20, the mark when this was made, #785). The mark is v26 since 2026-10-02, whose
 * film is muted and keeps every hue; the band keeps v20's until the owner says otherwise. What moves
 * it is new here: the film's thickness follows Vesper's domain warp, from the backdrop of the
 * owner's radial site (strakzat/radial, `scenes/vesper/shaders.ts`), which flows in broad, slow
 * swirls across a wide shape where the ball's own sines would repeat. The grain of dither at the
 * end is radial's too, so the long soft ramps do not band.
 *
 * Everything here is data and text: the component (`FilmBand`) owns the canvas.
 */

export const FILM_BAND_FRAGMENT = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 uRes;    // the canvas in pixels
uniform float uTime;  // seconds
uniform float uDark;  // 1 on a dark page: the film's colour tempered, as the mark's is there
uniform vec3 uPage;   // the page's own colour, read from its token, in sRGB

const float PI = 3.14159265;

// From orb-glass.ts, verbatim: smoothstep that allows a > b.
float sm(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

// From orb-glass.ts, verbatim: the study's film, no phase flip, thickness in nm.
vec3 filmS(float d, float c, float n) {
    float s = sqrt(1.0 - c * c) / n;
    float ct = sqrt(1.0 - s * s);
    float opd = 2.0 * n * d * ct;
    return 0.5 + 0.5 * cos(2.0 * PI * opd / vec3(650.0, 545.0, 460.0));
}
vec3 saturateS(vec3 c, float s) { float g = (c.r + c.g + c.b) / 3.0; return clamp(g + (c - g) * s, 0.0, 4.0); }

// From orb-glass.ts, verbatim: hue, saturation, value and back, and the turn that keeps green and
// yellow out of the film (yellow through green move on to cyan through blue).
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 noGreen(vec3 c) {
    vec3 h = rgb2hsv(c);
    float inBand = sm(0.06, 0.1, h.x) * (1.0 - sm(0.45, 0.49, h.x));
    h.x = fract(h.x + 0.35 * inBand);
    return hsv2rgb(h);
}

// From strakzat/radial, Vesper's backdrop's domain warp, verbatim.
vec3 warp3d(vec3 pos, float t){
    float curv = 0.8, a = 1.9, b = 0.7;
    pos *= 2.0;
    pos.x += curv*sin(t + a*pos.y) + t*b; pos.y += curv*cos(t + a*pos.x);
    pos.y += curv*sin(t + a*pos.z) + t*b; pos.z += curv*cos(t + a*pos.y);
    pos.z += curv*sin(t + a*pos.x) + t*b; pos.x += curv*cos(t + a*pos.z);
    return 0.5 + 0.5*cos(pos.xyz + vec3(1, 2, 4));
}

// From strakzat/radial: a grain of dither.
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
    // Measured in the band's height, so a wide band shows more swirls rather than wider ones.
    vec2 p = gl_FragCoord.xy / uRes.y;
    vec3 w = warp3d(vec3(p * 0.3, 0.3), uTime * 0.12);
    // The film thins and thickens with the warp between 409 and 455 nm, where it runs from pink
    // through violet to blue: the mark's colours, with no peach and no green to turn away. The
    // angle it is seen at leans a little with it, as a film on a curved surface would.
    float th = 432.0 + 23.0 * (2.0 * w.x - 1.0);
    float c = 0.85 + 0.15 * w.z;
    vec3 f = noGreen(saturateS(filmS(th, c, 1.33), 1.3));
    vec3 col;
    if (uDark > 0.5) {
        // On dark, as the mark: the film half as saturated, its light laid over the page.
        f = saturateS(f, 0.5);
        col = uPage + f * 0.26;
    } else {
        // On light, a pastel wash: the film's colour over a pale ground, then over the page.
        col = mix(uPage, mix(vec3(1.0), f, 0.45), 0.85);
    }
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    O = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
