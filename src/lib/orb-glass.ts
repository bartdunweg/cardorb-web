/**
 * The glass orb: a sphere of real material, lit in a small studio, drawn by the GPU.
 *
 * Four materials, one shader. Black glass is Luma's: a near-black body under a clear coat, an
 * oil-slick film where the surface turns away. Violet glass is the original Card Orb mark as a
 * solid: light enters, is coloured on its way through, and leaves. The bubble is a soap film,
 * nothing inside it: the page shows through, and what you see is the film's own colour, which
 * runs with the film's thickness and flows. The soap bubble is the study's: the same film, softer,
 * with the studio's pale wall showing through it rather than the page, which is what makes it
 * read as a milky white ball with pastel on it.
 *
 * The studio is fixed: a softbox top left, a strip light on the right, a dim bounce behind, a
 * floor the colour of what the orb sits on. `tilt` turns the whole studio, so a pointer can
 * carry the lights with it. Everything here is data and text: the component (`OrbGlass`) owns
 * the canvas.
 */

export type OrbGlassMaterial = "black" | "violet" | "bubble" | "soap";

export const ORB_GLASS_MATERIAL_INDEX: Record<OrbGlassMaterial, number> = { black: 0, violet: 1, bubble: 2, soap: 3 };

/** Which materials move on their own (a film that flows), so a frame loop knows to keep going. Glass only moves with the lights. */
export const ORB_GLASS_FLOWS: Record<OrbGlassMaterial, boolean> = { black: false, violet: false, bubble: true, soap: true };

/** A number a shader can take: the fraction of the canvas the sphere fills, leaving room for antialiasing. */
export const ORB_GLASS_FILL = 0.96;

export const ORB_GLASS_VERTEX = `#version 300 es
void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const ORB_GLASS_FRAGMENT = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 uRes;
uniform int uMat;        // 0 black glass, 1 violet glass, 2 iridescent bubble, 3 soap bubble
uniform vec3 uFloor;     // the colour under and behind the orb, in linear light
uniform float uFloorMix; // how much of the studio's lower half that colour replaces
uniform vec2 uTilt;      // where the lights are pulled to, -1..1 each way
uniform float uTime;     // seconds, for the bubble's film
uniform float uFill;

const float PI = 3.14159265;

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }

// A soft-edged rounded rectangle of light in direction ld, seen from inside the sphere.
vec3 panel(vec3 d, vec3 ld, vec2 hsz, float rad, float soft, vec3 col) {
    float along = dot(d, ld);
    if (along <= 0.03) return vec3(0.0);
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), ld));
    vec3 u = cross(ld, r);
    vec2 q = vec2(dot(d, r), dot(d, u)) / along;
    vec2 e = abs(q) - hsz + rad;
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - rad;
    float k = 1.0 - smoothstep(-soft, soft, sd);
    k *= 1.0 - 0.35 * smoothstep(0.0, 1.0, length(q / (hsz + 0.3)));
    k *= 0.75 + 0.25 * smoothstep(-1.0, 1.0, q.x / max(hsz.x, 0.1));
    return col * k;
}

// The studio, turned by the tilt so the lights travel with the pointer.
vec3 env(vec3 d) {
    d = rotX(-uTilt.y * 0.45) * rotY(uTilt.x * 0.7) * d;
    vec3 c = mix(vec3(0.016, 0.017, 0.022), vec3(0.16, 0.165, 0.19), smoothstep(-0.3, 1.0, d.y));
    c = mix(c, uFloor, smoothstep(-0.02, -0.55, d.y) * uFloorMix);
    c += panel(d, normalize(vec3(-0.58, 0.72, 0.60)), vec2(0.66, 0.46), 0.22, 0.16, vec3(5.6, 5.4, 5.1));
    c += panel(d, normalize(vec3(0.94, 0.02, 0.34)), vec2(0.055, 1.0), 0.05, 0.035, vec3(2.4, 2.6, 3.1));
    c += panel(d, normalize(vec3(0.25, -0.35, -0.9)), vec2(0.9, 0.6), 0.35, 0.4, vec3(0.20, 0.22, 0.28));
    return c;
}

vec3 sunDir() { return rotY(-uTilt.x * 0.7) * rotX(uTilt.y * 0.45) * normalize(vec3(-0.38, 0.46, 0.8)); }

vec3 keyDir() { return rotY(-uTilt.x * 0.7) * rotX(uTilt.y * 0.45) * normalize(vec3(-0.58, 0.72, 0.60)); }

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
// The study's curve: straight to 0.8, then a soft shoulder, so a pale wall stays pale.
vec3 soft(vec3 x) { return mix(clamp(x, 0.0, 1.0), 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.25)), step(0.8, x)); }

// What a film of the given thickness (in 100 nm) sends back at this angle: three wavelengths interfering.
vec3 film(float cosT, float thick, float n, float sat) {
    float cosF = sqrt(1.0 - (1.0 - cosT * cosT) / (n * n));
    float path = 2.0 * n * thick * cosF;
    vec3 ph = path / vec3(6.5, 5.4, 4.5);
    vec3 s = 0.5 + 0.5 * cos(2.0 * PI * ph + PI);
    float l = dot(s, vec3(0.333));
    return clamp(l + (s - l) * sat, 0.0, 1.0);
}

float fresnel(float f0, float x) { return f0 + (1.0 - f0) * pow(x, 5.0); }

vec4 shade(vec2 fc) {
    vec2 p = (fc - 0.5 * uRes) / (0.5 * uRes.y);
    vec3 ro = vec3(0.0, 0.42, 6.0);
    vec3 f = normalize(-ro);
    vec3 r = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
    vec3 u = cross(r, f);
    float th = tan(asin(1.0 / length(ro))) / uFill;
    vec3 rd = normalize(f + th * (p.x * r + p.y * u));

    float b = dot(ro, rd);
    float cc = dot(ro, ro) - 1.0;
    float h = b * b - cc;
    if (h < 0.0) return vec4(0.0);
    float t = -b - sqrt(h);
    vec3 pos = ro + rd * t;
    vec3 n = normalize(pos);
    float cosT = clamp(dot(n, -rd), 0.0, 1.0);
    float x = 1.0 - cosT;
    vec3 R = reflect(rd, n);
    vec3 refl = env(R);
    float kdif = max(dot(n, keyDir()), 0.0);
    float rl = clamp(dot(refl, vec3(0.2126, 0.7152, 0.0722)), 0.0, 2.0);

    if (uMat == 3) {
        // The study's bubble: a thin film front and back, the studio's wall seen through both.
        float flow = pos.y * 3.2 + uTime * 0.5 + 1.2 * sin(pos.x * 2.4 + uTime * 0.27 + 0.5) + 0.6 * sin((pos.x + pos.z) * 4.2 - uTime * 0.35);
        float thick = 3.8 + 1.7 * sin(flow) + 1.4 * x;
        float amp = 0.04 + 0.96 * pow(x, 3.0);
        vec3 R1 = film(cosT, thick, 1.33, 1.5) * amp * 1.9;
        vec3 front = refl * R1;
        vec3 p2 = ro + rd * (-b + sqrt(h));
        vec3 n2 = -normalize(p2);
        float cos2 = clamp(dot(n2, -rd), 0.0, 1.0);
        vec3 R2 = film(cos2, thick + 0.6, 1.33, 1.5) * amp * 1.4;
        vec3 back = env(reflect(rd, n2)) * R2;
        // The wall behind the bubble: the studio's own pale grey, leaning to the page it sits on.
        vec3 wall = mix(vec3(0.72, 0.72, 0.75), uFloor, 0.45) * (0.88 + 0.12 * kdif);
        vec3 T = (1.0 - R1) * (1.0 - R2);
        float sun = pow(max(dot(R, sunDir()), 0.0), 700.0) * 22.0;
        vec3 col = front + back + wall * T + vec3(sun);
        col = pow(soft(col), vec3(1.0 / 2.2));
        return vec4(col, 1.0);
    }

    if (uMat == 2) {
        // The film's thickness drains downward and flows with time; that alone is the colour.
        // Broad, slow swaths rather than tight bands: the film varies over the whole ball, not every few degrees.
        float flow = pos.y * 1.3 + uTime * 0.3 + 0.9 * sin(pos.x * 1.1 + uTime * 0.17) + 0.5 * sin((pos.x + pos.z) * 1.8 - uTime * 0.23);
        float thick = 2.6 + 0.9 * sin(flow) + 0.5 * (0.5 - 0.5 * pos.y) + 0.8 * x;
        float F1 = fresnel(0.02, x);
        vec3 front = refl * film(cosT, thick, 1.33, 1.4) * F1;
        // The far side of the shell, seen through the near one, mirrors the studio the other way.
        vec3 p2 = ro + rd * (-b + sqrt(h));
        vec3 n2 = -normalize(p2);
        float cos2 = clamp(dot(n2, -rd), 0.0, 1.0);
        float F2 = fresnel(0.02, 1.0 - cos2) * (1.0 - F1);
        vec3 back = env(reflect(rd, n2)) * film(cos2, thick + 0.6, 1.33, 1.6) * F2;
        // A bright milky body, lit from the top left, with the film's colour laid over it in soft washes.
        float haze = 0.62 + 0.18 * kdif;
        vec3 wash = film(cosT, thick, 1.33, 1.25);
        // The reference leans blue and pink: the film's green is held back, its blue and red let through.
        wash = wash * vec3(1.1, 0.7, 1.3) + vec3(0.02, 0.0, 0.12);
        // The body itself is pale blue at the top and pink low left, as the reference is lit.
        vec3 body = mix(vec3(0.5, 0.76, 1.0), vec3(0.92, 0.42, 0.9), smoothstep(0.55, -0.55, n.y + n.x * 0.45));
        // A pale centre, so the colour sits at the sides and the ball reads as lit from within.
        body = mix(body, vec3(0.92, 0.95, 1.0), 0.55 * smoothstep(0.75, 0.2, length(n.xy - vec2(0.15, 0.2))));
        vec3 milk = mix(body, wash, 0.4) * haze;
        vec3 face = wash * (0.12 + 0.4 * rl) * (1.0 - x) * 0.3;
        // Light that came in at the top leaves low in the ball: a warm hot spot, and a glow along the bottom rim.
        vec3 hot = normalize(vec3(-0.12, -0.62, 0.77));
        float spot = pow(max(dot(n, hot), 0.0), 40.0);
        vec3 glowc = vec3(1.0, 0.95, 0.85) * spot * 3.0 + vec3(1.0, 0.65, 0.9) * pow(max(dot(n, hot), 0.0), 5.0) * 0.6;
        float pool = pow(x, 2.0) * (0.5 + 0.5 * smoothstep(0.3, -0.7, n.y)) * 0.3;
        // The glass rim: a thin bright line where the shell is seen edge-on.
        float rim = smoothstep(0.86, 0.985, x) * (1.0 - smoothstep(0.985, 1.0, x));
        // The shell has thickness: a second, fainter contour a little way in, as the reference shows.
        float inner = smoothstep(0.62, 0.72, x) * (1.0 - smoothstep(0.72, 0.8, x));
        vec3 col = front * 1.6 + back * 1.2 + milk + face + glowc + vec3(pool) * wash + vec3(rim) * 0.7 + vec3(inner) * 0.18;
        float a = clamp(F1 + F2 + haze + spot * 0.5 + pool * 0.6 + rim * 0.5 + 0.15 * (1.0 - x), 0.0, 1.0);
        col = pow(aces(col), vec3(1.0 / 2.2));
        return vec4(col, a);
    }

    float F0 = (uMat == 0) ? 0.075 : 0.045;
    float F = fresnel(F0, x);
    float thick = 3.6 + 0.7 * sin(pos.y * 2.2 + pos.x * 1.3) + 0.35 * cos(pos.x * 3.1 - pos.z * 1.7);
    vec3 irid = film(cosT, thick, 1.35, 2.2);
    float iw = smoothstep(0.34, 0.78, x) * (1.0 - 0.5 * smoothstep(0.94, 1.0, x));

    vec3 col;
    if (uMat == 0) {
        vec3 body = vec3(0.004, 0.004, 0.006);
        vec3 sheen = vec3(0.05, 0.05, 0.06) * pow(kdif, 3.0);
        col = body + sheen + refl * F;
        col += irid * iw * F * (0.25 + 1.5 * rl);
        col += irid * iw * 0.11;
    } else {
        vec3 rr = refract(rd, n, 1.0 / 1.52);
        float chord = -2.0 * dot(rr, n);
        vec3 p2 = pos + rr * chord;
        vec3 n2 = normalize(p2);
        vec3 outd = refract(rr, -n2, 1.52);
        if (dot(outd, outd) < 0.5) outd = reflect(rr, -n2);
        vec3 through = env(outd);
        vec3 T = exp(-vec3(0.75, 1.30, 0.12) * chord);
        vec3 violet = vec3(0.106, 0.031, 0.72);
        vec3 scatter = violet * (0.22 + 0.45 * kdif);
        vec3 rim = violet * 2.4 * pow(x, 2.4) * (0.5 + 0.5 * smoothstep(0.3, -0.7, n.y));
        col = (1.0 - F) * (through * T * 1.25 + scatter * 0.9 + rim * 0.7) + refl * F;
        col += irid * iw * F * (0.15 + 0.5 * rl);
    }
    col = pow(aces(col), vec3(1.0 / 2.2));
    return vec4(col, 1.0);
}

void main() {
    vec4 acc = vec4(0.0);
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
        vec2 off = vec2(float(i) + 0.5, float(j) + 0.5) * 0.5;
        acc += shade(gl_FragCoord.xy - 0.5 + off);
    }
    acc *= 0.25;
    O = vec4(acc.rgb * acc.a, acc.a);
}`;

/** The floor and backdrop the orb mirrors, in linear light, for the surface it sits on. */
export const ORB_GLASS_FLOOR: Record<"light" | "dark", [number, number, number]> = {
    light: [1, 1, 1],
    dark: [0.047, 0.055, 0.07],
};

/**
 * Where the lights go for a pointer at (x, y) on a page, for an orb whose centre is at (cx, cy)
 * and whose reach is `reach` px: -1..1 each way, and 0 when the pointer is on the orb itself.
 * The reach is well past the orb, so every orb on a page leans the same way at once.
 */
export function orbGlassTilt(x: number, y: number, cx: number, cy: number, reach: number): [number, number] {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    return [clamp((x - cx) / reach), clamp((cy - y) / reach)];
}
